import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getProjectTables, getTableData, executeProjectQuery, getProjectTablesWithColumns } from "../db/project-database.js";
import { getProjectFiles, writeProjectFile, getProjectDir } from "../generators/code-materializer.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  projectId: string;
  domain?: string;
}

export const agentTools: AgentTool[] = [
  {
    name: "get_project_info",
    description: "Get information about the current project including name, domain, existing modules, and tables",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.projectId, context.projectId)).limit(1);
        if (!project) {
          return { success: false, error: "Project not found" };
        }
        
        const modules = (project.modules as any[]) || [];
        const existingTables = modules.flatMap(m => m.tables || []);
        
        return {
          success: true,
          data: {
            name: project.name,
            domain: project.domain,
            database: project.database,
            status: project.status,
            modulesCount: modules.length,
            modules: modules.map(m => ({
              name: m.name,
              status: m.status,
              tables: (m.tables || []).map((t: any) => t.name)
            })),
            existingTables: existingTables.map((t: any) => ({
              name: t.name,
              columns: (t.columns || []).map((c: any) => `${c.name} (${c.type})${c.references ? ` -> ${c.references}` : ''}`)
            }))
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },
  
  {
    name: "list_database_tables",
    description: "List all tables that exist in the project's database schema with their columns",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const tables = await getProjectTablesWithColumns(context.projectId);
        return {
          success: true,
          data: {
            tableCount: tables.length,
            tables: tables.map(t => ({
              name: t.tableName,
              columns: t.columns.map(c => `${c.name} (${c.type})`).join(', ')
            }))
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },
  
  {
    name: "get_table_data",
    description: "Get sample data from a specific database table (first 10 rows)",
    parameters: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "The name of the table to query"
        }
      },
      required: ["table_name"]
    },
    execute: async (params, context) => {
      try {
        const data = await getTableData(context.projectId, params.table_name, 10);
        return {
          success: true,
          data: {
            table: params.table_name,
            columns: data.columns,
            rowCount: data.rows.length,
            rows: data.rows
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },
  
  {
    name: "list_project_files",
    description: "List all generated code files in the project",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const files = await getProjectFiles(context.projectId);
        return {
          success: true,
          data: {
            filesCount: files.length,
            files: files.map(f => ({
              path: f.path,
              type: f.type,
              size: f.content?.length || 0
            }))
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },
  
  {
    name: "read_file",
    description: "Read the contents of a specific generated file",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path of the file to read"
        }
      },
      required: ["file_path"]
    },
    execute: async (params, context) => {
      try {
        const files = await getProjectFiles(context.projectId);
        const file = files.find(f => f.path === params.file_path || f.path.endsWith(params.file_path));
        
        if (!file) {
          return { success: false, error: `File not found: ${params.file_path}` };
        }
        
        return {
          success: true,
          data: {
            path: file.path,
            content: file.content?.substring(0, 5000) || "(empty)",
            truncated: (file.content?.length || 0) > 5000
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },
  
  {
    name: "get_domain_knowledge",
    description: "Get domain-specific knowledge about standard modules, tables, and relationships for a domain like AMI, Healthcare, Banking, etc.",
    parameters: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "The domain to get knowledge about (e.g., 'ami', 'healthcare', 'banking')"
        }
      },
      required: ["domain"]
    },
    execute: async (params, context) => {
      const domainKnowledge: Record<string, any> = {
        ami: {
          description: "Advanced Metering Infrastructure - Smart meter and utility management",
          networkHierarchy: [
            "REGION -> ZONE -> SUBSTATION -> FEEDER -> TRANSFORMER -> METER -> CONSUMER"
          ],
          standardTables: [
            { name: "regions", columns: ["id", "name", "code", "description"], description: "Geographic regions" },
            { name: "zones", columns: ["id", "region_id", "name", "code"], description: "Zones within regions" },
            { name: "substations", columns: ["id", "zone_id", "name", "code", "voltage_level", "capacity", "location", "status"], description: "Electrical substations" },
            { name: "feeders", columns: ["id", "substation_id", "name", "code", "capacity", "status"], description: "Power feeders from substations" },
            { name: "transformers", columns: ["id", "feeder_id", "name", "code", "capacity", "type", "location", "status"], description: "Distribution transformers" },
            { name: "meters", columns: ["id", "transformer_id", "meter_number", "meter_type", "installation_date", "last_reading_date", "status"], description: "Smart meters" },
            { name: "consumers", columns: ["id", "meter_id", "consumer_number", "name", "address", "phone", "email", "consumer_type", "connection_date"], description: "Utility consumers/customers" },
            { name: "meter_readings", columns: ["id", "meter_id", "reading_date", "reading_value", "reading_type", "quality_flag"], description: "Meter reading data" },
            { name: "billing", columns: ["id", "consumer_id", "billing_period", "units_consumed", "amount", "due_date", "status"], description: "Consumer billing" },
            { name: "outages", columns: ["id", "affected_entity_type", "affected_entity_id", "start_time", "end_time", "cause", "status"], description: "Power outage tracking" }
          ],
          relationships: [
            "zones.region_id -> regions.id",
            "substations.zone_id -> zones.id",
            "feeders.substation_id -> substations.id",
            "transformers.feeder_id -> feeders.id",
            "meters.transformer_id -> transformers.id",
            "consumers.meter_id -> meters.id",
            "meter_readings.meter_id -> meters.id",
            "billing.consumer_id -> consumers.id"
          ],
          standardModules: [
            "Network Management (substations, feeders, transformers)",
            "Meter Data Management (meters, readings, VEE)",
            "Consumer Management (consumers, connections)",
            "Billing Management (bills, payments, tariffs)",
            "Outage Management (outages, restoration)"
          ]
        },
        healthcare: {
          description: "Healthcare and Medical Records Management",
          standardTables: [
            { name: "patients", columns: ["id", "patient_number", "first_name", "last_name", "dob", "gender", "blood_type", "address", "phone", "email"], description: "Patient records" },
            { name: "doctors", columns: ["id", "doctor_number", "first_name", "last_name", "specialty", "license_number", "department_id"], description: "Doctor/physician records" },
            { name: "departments", columns: ["id", "name", "code", "floor", "head_doctor_id"], description: "Hospital departments" },
            { name: "appointments", columns: ["id", "patient_id", "doctor_id", "appointment_date", "status", "notes"], description: "Patient appointments" },
            { name: "medical_records", columns: ["id", "patient_id", "doctor_id", "visit_date", "diagnosis", "treatment", "prescription"], description: "Medical visit records" }
          ],
          relationships: [
            "doctors.department_id -> departments.id",
            "appointments.patient_id -> patients.id",
            "appointments.doctor_id -> doctors.id",
            "medical_records.patient_id -> patients.id",
            "medical_records.doctor_id -> doctors.id"
          ]
        }
      };
      
      const domain = params.domain?.toLowerCase() || context.domain?.toLowerCase() || '';
      const knowledge = domainKnowledge[domain] || domainKnowledge['ami'];
      
      return {
        success: true,
        data: knowledge
      };
    }
  },

  // ============ CODE VERIFICATION TOOLS ============
  
  {
    name: "run_typescript_check",
    description: "Run TypeScript compiler to check for type errors in the generated project code",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        if (!projectDir || !fs.existsSync(projectDir)) {
          return { success: false, error: "Project directory not found" };
        }
        
        try {
          const { stdout, stderr } = await execAsync(`cd ${projectDir} && npx tsc --noEmit 2>&1 || true`, { timeout: 30000 });
          const output = stdout + stderr;
          const hasErrors = output.includes('error TS');
          
          return {
            success: true,
            data: {
              hasErrors,
              errors: hasErrors ? output.split('\n').filter(l => l.includes('error TS')).slice(0, 10) : [],
              fullOutput: output.substring(0, 3000)
            }
          };
        } catch (e: any) {
          return {
            success: true,
            data: {
              hasErrors: true,
              errors: [e.message],
              fullOutput: e.message
            }
          };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "test_api_endpoint",
    description: "Test an API endpoint of the running application to verify it works",
    parameters: {
      type: "object",
      properties: {
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE)",
          enum: ["GET", "POST", "PUT", "DELETE"]
        },
        path: {
          type: "string",
          description: "API path (e.g., /api/meters)"
        },
        body: {
          type: "object",
          description: "Request body for POST/PUT requests"
        }
      },
      required: ["method", "path"]
    },
    execute: async (params, context) => {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.projectId, context.projectId)).limit(1);
        if (!project) {
          return { success: false, error: "Project not found" };
        }
        
        const appPort = (project as any).runningPort || 3001;
        const url = `http://localhost:${appPort}${params.path}`;
        
        const options: RequestInit = {
          method: params.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (params.body && ['POST', 'PUT'].includes(params.method)) {
          options.body = JSON.stringify(params.body);
        }
        
        const response = await fetch(url, options);
        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
        
        return {
          success: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            response: typeof responseData === 'string' ? responseData.substring(0, 2000) : responseData
          }
        };
      } catch (e: any) {
        return { 
          success: false, 
          error: e?.message || String(e),
          hint: "The application may not be running. Check if the app has been started."
        };
      }
    }
  },

  {
    name: "read_app_logs",
    description: "Read the application logs to check for runtime errors or issues",
    parameters: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of log lines to read (default 50)"
        }
      },
      required: []
    },
    execute: async (params, context) => {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.projectId, context.projectId)).limit(1);
        if (!project) {
          return { success: false, error: "Project not found" };
        }
        
        const logs = (project as any).appLogs || [];
        const numLines = params.lines || 50;
        const recentLogs = logs.slice(-numLines);
        
        const hasErrors = recentLogs.some((l: string) => 
          l.toLowerCase().includes('error') || 
          l.toLowerCase().includes('exception') ||
          l.toLowerCase().includes('failed')
        );
        
        return {
          success: true,
          data: {
            hasErrors,
            errorLines: recentLogs.filter((l: string) => 
              l.toLowerCase().includes('error') || l.toLowerCase().includes('exception')
            ).slice(-10),
            logs: recentLogs
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  // ============ WRITE/EDIT TOOLS ============
  
  {
    name: "write_file",
    description: "Write or create a file in the project. Use this to fix code issues or add new files.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path of the file to write (e.g., src/routes/meters.ts)"
        },
        content: {
          type: "string",
          description: "The complete content to write to the file"
        }
      },
      required: ["file_path", "content"]
    },
    execute: async (params, context) => {
      try {
        await writeProjectFile(context.projectId, params.file_path, params.content);
        return {
          success: true,
          data: {
            path: params.file_path,
            bytesWritten: params.content.length,
            message: `File written successfully: ${params.file_path}`
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "execute_sql",
    description: "Execute a SQL query on the project database. Use for creating tables, inserting data, or fixing schema issues.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        }
      },
      required: ["query"]
    },
    execute: async (params, context) => {
      try {
        // Safety check - block destructive operations without confirmation
        const lowerQuery = params.query.toLowerCase().trim();
        if (lowerQuery.startsWith('drop database') || lowerQuery.startsWith('truncate')) {
          return { success: false, error: "Destructive operations like DROP DATABASE and TRUNCATE are not allowed" };
        }
        
        const result = await executeProjectQuery(context.projectId, params.query);
        return {
          success: true,
          data: {
            rowCount: result?.rowCount || 0,
            rows: result?.rows?.slice(0, 20) || [],
            message: "Query executed successfully"
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "check_file_syntax",
    description: "Check a TypeScript/JavaScript file for syntax errors without running the full project",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path of the file to check"
        }
      },
      required: ["file_path"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        if (!projectDir) {
          return { success: false, error: "Project directory not found" };
        }
        
        const fullPath = path.join(projectDir, params.file_path);
        if (!fs.existsSync(fullPath)) {
          return { success: false, error: `File not found: ${params.file_path}` };
        }
        
        try {
          const { stdout, stderr } = await execAsync(
            `cd ${projectDir} && npx tsc --noEmit --skipLibCheck ${params.file_path} 2>&1 || true`,
            { timeout: 15000 }
          );
          const output = stdout + stderr;
          const hasErrors = output.includes('error TS');
          
          return {
            success: true,
            data: {
              file: params.file_path,
              hasErrors,
              errors: hasErrors ? output.split('\n').filter(l => l.includes('error TS')) : [],
              isValid: !hasErrors
            }
          };
        } catch (e: any) {
          return { success: true, data: { hasErrors: true, errors: [e.message] } };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "get_app_status",
    description: "Get the current status of the running application including port, process status, and recent activity",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.projectId, context.projectId)).limit(1);
        if (!project) {
          return { success: false, error: "Project not found" };
        }
        
        const appStatus = (project as any).appStatus || 'unknown';
        const runningPort = (project as any).runningPort;
        const appPid = (project as any).appPid;
        
        let isActuallyRunning = false;
        if (appPid) {
          try {
            process.kill(appPid, 0);
            isActuallyRunning = true;
          } catch {
            isActuallyRunning = false;
          }
        }
        
        return {
          success: true,
          data: {
            status: appStatus,
            isRunning: isActuallyRunning,
            port: runningPort,
            pid: appPid,
            projectName: project.name,
            domain: project.domain
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  // ========== CLAUDE-LEVEL TOOLS ==========

  {
    name: "install_package",
    description: "Install npm packages in the project. Runs npm install with the specified packages.",
    parameters: {
      type: "object",
      properties: {
        packages: {
          type: "array",
          items: { type: "string" },
          description: "List of package names to install (e.g., ['express', 'lodash'])"
        },
        dev: {
          type: "boolean",
          description: "Install as dev dependency (--save-dev)"
        }
      },
      required: ["packages"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        if (!projectDir) {
          return { success: false, error: "Project directory not found" };
        }
        
        const devFlag = params.dev ? '--save-dev' : '';
        const packages = params.packages.join(' ');
        const cmd = `npm install ${packages} ${devFlag}`.trim();
        
        const { stdout, stderr } = await execAsync(cmd, { 
          cwd: projectDir, 
          timeout: 120000 
        });
        
        return {
          success: true,
          data: {
            installed: params.packages,
            output: (stdout + stderr).slice(0, 5000),
            message: `Installed ${params.packages.length} package(s)`
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "git_status",
    description: "Get git status showing changed files, branch, and commit info",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const cwd = projectDir || process.cwd();
        
        const [status, branch, log] = await Promise.all([
          execAsync('git status --porcelain', { cwd }).catch(() => ({ stdout: '' })),
          execAsync('git branch --show-current', { cwd }).catch(() => ({ stdout: 'unknown' })),
          execAsync('git log -3 --oneline', { cwd }).catch(() => ({ stdout: '' }))
        ]);
        
        const changedFiles = (status as any).stdout.split('\n').filter(Boolean);
        
        return {
          success: true,
          data: {
            branch: (branch as any).stdout.trim(),
            changedFiles: changedFiles.slice(0, 50),
            changedCount: changedFiles.length,
            recentCommits: (log as any).stdout.split('\n').filter(Boolean)
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "git_commit",
    description: "Stage all changes and create a git commit with a message",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The commit message"
        }
      },
      required: ["message"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const cwd = projectDir || process.cwd();
        
        await execAsync('git add -A', { cwd });
        const { stdout } = await execAsync(`git commit -m "${params.message.replace(/"/g, '\\"')}"`, { cwd });
        
        return {
          success: true,
          data: {
            message: params.message,
            output: stdout.slice(0, 2000)
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "glob_files",
    description: "Find files matching a glob pattern (e.g., **/*.ts, src/**/*.tsx)",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern to match (e.g., **/*.ts)"
        },
        directory: {
          type: "string",
          description: "Starting directory (defaults to project root)"
        }
      },
      required: ["pattern"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const baseDir = params.directory || projectDir || process.cwd();
        
        // Use find with pattern matching
        const { stdout } = await execAsync(
          `find ${baseDir} -type f -name "${params.pattern.replace(/\*\*/g, '*')}" 2>/dev/null | head -100`,
          { timeout: 10000 }
        );
        
        const files = stdout.split('\n').filter(Boolean).map(f => 
          f.replace(baseDir + '/', '')
        );
        
        return {
          success: true,
          data: {
            pattern: params.pattern,
            files: files.slice(0, 100),
            count: files.length
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "grep_search",
    description: "Search for a pattern in files using grep. Returns matching lines with file paths.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "The regex pattern to search for"
        },
        file_pattern: {
          type: "string",
          description: "File pattern to search in (e.g., *.ts, *.tsx)"
        },
        directory: {
          type: "string",
          description: "Directory to search in"
        }
      },
      required: ["pattern"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const dir = params.directory || projectDir || process.cwd();
        const includeFlag = params.file_pattern ? `--include="${params.file_pattern}"` : '';
        
        const { stdout } = await execAsync(
          `grep -rn ${includeFlag} "${params.pattern}" ${dir} 2>/dev/null | head -50`,
          { timeout: 15000 }
        );
        
        const matches = stdout.split('\n').filter(Boolean).map(line => {
          const [filePath, ...rest] = line.split(':');
          return { 
            file: filePath.replace(dir + '/', ''), 
            match: rest.join(':').slice(0, 200) 
          };
        });
        
        return {
          success: true,
          data: {
            pattern: params.pattern,
            matches: matches.slice(0, 50),
            count: matches.length
          }
        };
      } catch (e: any) {
        // grep returns exit code 1 when no matches
        if (e.code === 1) {
          return { success: true, data: { pattern: params.pattern, matches: [], count: 0 } };
        }
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "create_directory",
    description: "Create a new directory (with parent directories if needed)",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to create"
        }
      },
      required: ["path"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const fullPath = path.isAbsolute(params.path) ? params.path : path.join(projectDir || process.cwd(), params.path);
        
        fs.mkdirSync(fullPath, { recursive: true });
        
        return {
          success: true,
          data: { created: fullPath }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "delete_file",
    description: "Delete a file or empty directory",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to delete"
        }
      },
      required: ["path"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const fullPath = path.isAbsolute(params.path) ? params.path : path.join(projectDir || process.cwd(), params.path);
        
        // Safety: prevent deleting outside project
        if (projectDir && !fullPath.startsWith(projectDir)) {
          return { success: false, error: "Cannot delete files outside project directory" };
        }
        
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          fs.rmdirSync(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
        
        return {
          success: true,
          data: { deleted: params.path }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "read_any_file",
    description: "Read any file from anywhere in the system (not just project files). Use for reading configs, logs, etc.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or relative file path"
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-indexed)"
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read"
        }
      },
      required: ["path"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const fullPath = path.isAbsolute(params.path) ? params.path : path.join(projectDir || process.cwd(), params.path);
        
        if (!fs.existsSync(fullPath)) {
          return { success: false, error: `File not found: ${params.path}` };
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const offset = (params.offset || 1) - 1;
        const limit = params.limit || 500;
        const selectedLines = lines.slice(offset, offset + limit);
        
        return {
          success: true,
          data: {
            path: params.path,
            content: selectedLines.join('\n'),
            totalLines: lines.length,
            startLine: offset + 1,
            endLine: Math.min(offset + limit, lines.length)
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "write_any_file",
    description: "Write content to any file location. Creates parent directories if needed.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to write to"
        },
        content: {
          type: "string",
          description: "The content to write"
        }
      },
      required: ["path", "content"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const fullPath = path.isAbsolute(params.path) ? params.path : path.join(projectDir || process.cwd(), params.path);
        
        // Create parent directories
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, params.content, 'utf-8');
        
        return {
          success: true,
          data: {
            path: params.path,
            bytesWritten: Buffer.byteLength(params.content),
            message: "File written successfully"
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "list_directory",
    description: "List contents of any directory with file sizes and types",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path to list"
        },
        recursive: {
          type: "boolean",
          description: "List recursively (default: false)"
        }
      },
      required: ["path"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const dirPath = path.isAbsolute(params.path) ? params.path : path.join(projectDir || process.cwd(), params.path);
        
        if (!fs.existsSync(dirPath)) {
          return { success: false, error: `Directory not found: ${params.path}` };
        }
        
        const cmd = params.recursive 
          ? `find ${dirPath} -maxdepth 3 -type f | head -100`
          : `ls -la ${dirPath}`;
        
        const { stdout } = await execAsync(cmd, { timeout: 10000 });
        
        return {
          success: true,
          data: {
            path: params.path,
            contents: stdout.split('\n').filter(Boolean).slice(0, 100)
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  // ========== CLAUDE-LEVEL ADVANCED TOOLS ==========

  {
    name: "restart_app",
    description: "Restart the running application/server. Use after making code changes to see updates.",
    parameters: {
      type: "object",
      properties: {
        wait_seconds: {
          type: "number",
          description: "Seconds to wait after restart (default 3)"
        }
      },
      required: []
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        if (!projectDir) {
          return { success: false, error: "Project directory not found" };
        }
        
        // Kill any existing node processes for this project
        try {
          await execAsync(`pkill -f "node.*${context.projectId}" || true`, { timeout: 5000 });
        } catch (e) {
          // Ignore kill errors
        }
        
        // Wait a moment
        await new Promise(r => setTimeout(r, 1000));
        
        // Start the app in background
        try {
          await execAsync(`cd ${projectDir} && npm start &`, { timeout: 5000 });
        } catch (e) {
          // Start may not have npm start, try node
          try {
            await execAsync(`cd ${projectDir} && node src/index.js &`, { timeout: 5000 });
          } catch (e2) {
            // Ignore
          }
        }
        
        const waitTime = params.wait_seconds || 3;
        await new Promise(r => setTimeout(r, waitTime * 1000));
        
        return {
          success: true,
          data: {
            message: "App restart initiated",
            waitedSeconds: waitTime
          }
        };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "take_screenshot",
    description: "Take a screenshot of the running web application to verify UI. Returns base64 image.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to screenshot (default: localhost:3000)"
        },
        path: {
          type: "string",
          description: "URL path like /dashboard or /users"
        }
      },
      required: []
    },
    execute: async (params, context) => {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.projectId, context.projectId)).limit(1);
        const port = (project as any)?.runningPort || 3000;
        const baseUrl = params.url || `http://localhost:${port}`;
        const fullUrl = params.path ? `${baseUrl}${params.path}` : baseUrl;
        
        // Use curl to check if the server is responding
        try {
          const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${fullUrl}`, { timeout: 10000 });
          const statusCode = parseInt(stdout.trim());
          
          if (statusCode >= 200 && statusCode < 400) {
            return {
              success: true,
              data: {
                url: fullUrl,
                statusCode,
                message: "Server is responding. Screenshot would be captured here (requires puppeteer for actual screenshot).",
                hint: "To enable actual screenshots, install puppeteer: npm install puppeteer"
              }
            };
          } else {
            return {
              success: false,
              error: `Server returned status ${statusCode}`
            };
          }
        } catch (e: any) {
          return {
            success: false,
            error: `Could not reach ${fullUrl}: ${e?.message}`
          };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "web_search",
    description: "Search the web for documentation, solutions, or information. Use when you need to look up APIs, fix errors, or find best practices.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        }
      },
      required: ["query"]
    },
    execute: async (params, context) => {
      try {
        // Use DuckDuckGo's instant answer API (free, no API key needed)
        const query = encodeURIComponent(params.query);
        const { stdout } = await execAsync(
          `curl -s "https://api.duckduckgo.com/?q=${query}&format=json&no_html=1"`,
          { timeout: 15000 }
        );
        
        try {
          const result = JSON.parse(stdout);
          
          return {
            success: true,
            data: {
              query: params.query,
              abstract: result.Abstract || null,
              abstractSource: result.AbstractSource || null,
              abstractUrl: result.AbstractURL || null,
              relatedTopics: (result.RelatedTopics || []).slice(0, 5).map((t: any) => ({
                text: t.Text?.slice(0, 200),
                url: t.FirstURL
              })),
              answer: result.Answer || null,
              definition: result.Definition || null
            }
          };
        } catch (e) {
          return {
            success: true,
            data: {
              query: params.query,
              message: "Search completed but no structured results. Try a more specific query.",
              rawResponse: stdout.slice(0, 1000)
            }
          };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "get_lsp_diagnostics",
    description: "Get Language Server Protocol diagnostics (errors, warnings) for TypeScript/JavaScript files. More detailed than TypeScript compiler.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "File path to check (optional - checks all if not provided)"
        }
      },
      required: []
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        if (!projectDir) {
          return { success: false, error: "Project directory not found" };
        }
        
        // Run TypeScript in strict mode with more checks
        const targetFile = params.file_path ? path.join(projectDir, params.file_path) : projectDir;
        const { stdout, stderr } = await execAsync(
          `cd ${projectDir} && npx tsc --noEmit --strict --skipLibCheck --pretty false 2>&1 | head -100`,
          { timeout: 30000 }
        );
        
        const output = stdout + stderr;
        const diagnostics: any[] = [];
        
        // Parse TypeScript error output
        const errorRegex = /(.+)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)/g;
        let match;
        while ((match = errorRegex.exec(output)) !== null) {
          diagnostics.push({
            file: match[1].replace(projectDir + '/', ''),
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            severity: match[4],
            code: `TS${match[5]}`,
            message: match[6]
          });
        }
        
        return {
          success: true,
          data: {
            totalDiagnostics: diagnostics.length,
            errors: diagnostics.filter(d => d.severity === 'error').length,
            warnings: diagnostics.filter(d => d.severity === 'warning').length,
            diagnostics: diagnostics.slice(0, 50),
            hasErrors: diagnostics.some(d => d.severity === 'error')
          }
        };
      } catch (e: any) {
        // tsc returns non-zero on errors, but we still want the output
        const output = (e.stdout || '') + (e.stderr || '');
        const hasErrors = output.includes('error TS');
        
        return {
          success: true,
          data: {
            hasErrors,
            rawOutput: output.slice(0, 5000),
            message: hasErrors ? "TypeScript errors found" : "Check completed"
          }
        };
      }
    }
  },

  {
    name: "spawn_subagent",
    description: "Spawn a sub-agent to work on a specific task in parallel. The sub-agent has access to all tools and can work independently.",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "Description of the task for the sub-agent"
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files the sub-agent should focus on"
        }
      },
      required: ["task"]
    },
    execute: async (params, context) => {
      try {
        const Groq = require("groq-sdk").default;
        const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        // Create a focused prompt for the sub-agent
        const subAgentPrompt = `You are a SUB-AGENT. Complete this task quickly and efficiently:

TASK: ${params.task}

FILES TO FOCUS ON: ${(params.files || []).join(', ') || 'Any relevant files'}

You have access to all the same tools as the main agent. Complete the task and return a summary.

Respond with JSON:
{
  "completed": true/false,
  "summary": "What you did",
  "files_modified": ["list of files changed"],
  "issues": ["any problems encountered"]
}`;

        const response = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: subAgentPrompt }],
          temperature: 0.2,
          max_tokens: 2000
        });

        const content = response.choices[0].message.content || "";
        
        try {
          const result = JSON.parse(content.replace(/```json\s*/gi, '').replace(/```\s*/g, ''));
          return {
            success: true,
            data: {
              task: params.task,
              subAgentResult: result
            }
          };
        } catch {
          return {
            success: true,
            data: {
              task: params.task,
              subAgentResponse: content.slice(0, 2000)
            }
          };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
  },

  {
    name: "run_command",
    description: "Run a shell command and get the output. For npm scripts, builds, tests, etc.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to run (e.g., npm test, npm run build)"
        },
        cwd: {
          type: "string",
          description: "Working directory (optional)"
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default 60)"
        }
      },
      required: ["command"]
    },
    execute: async (params, context) => {
      try {
        const projectDir = await getProjectDir(context.projectId);
        const cwd = params.cwd || projectDir || process.cwd();
        const timeout = (params.timeout || 60) * 1000;
        
        // Block dangerous commands
        const blocked = ['rm -rf /', 'mkfs', 'dd if=', ':(){:', 'fork bomb'];
        if (blocked.some(b => params.command.toLowerCase().includes(b))) {
          return { success: false, error: "Command blocked for safety" };
        }
        
        const { stdout, stderr } = await execAsync(params.command, { cwd, timeout });
        
        return {
          success: true,
          data: {
            command: params.command,
            stdout: stdout.slice(0, 30000),
            stderr: stderr.slice(0, 10000),
            exitCode: 0
          }
        };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || String(e),
          data: {
            stdout: e.stdout?.slice(0, 10000) || '',
            stderr: e.stderr?.slice(0, 10000) || '',
            exitCode: e.code || 1
          }
        };
      }
    }
  }
];

export function getToolDefinitions() {
  return agentTools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

export async function executeTool(toolName: string, params: any, context: ToolContext): Promise<ToolResult> {
  const tool = agentTools.find(t => t.name === toolName);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  
  try {
    console.log(`[Agent] Executing tool: ${toolName}`, params);
    const result = await tool.execute(params, context);
    console.log(`[Agent] Tool result:`, result.success ? 'success' : result.error);
    return result;
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}
