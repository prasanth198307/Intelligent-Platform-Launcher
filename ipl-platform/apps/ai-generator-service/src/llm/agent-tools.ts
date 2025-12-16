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
