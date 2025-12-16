import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getProjectTables, getTableData } from "../db/project-database.js";
import { getProjectFiles } from "../generators/code-materializer.js";

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
    description: "List all tables that exist in the project's database schema",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    execute: async (params, context) => {
      try {
        const tables = await getProjectTables(context.projectId);
        return {
          success: true,
          data: {
            tables: tables.map(t => ({
              name: t.tableName,
              columns: t.columns
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
            rowCount: data.length,
            rows: data
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
