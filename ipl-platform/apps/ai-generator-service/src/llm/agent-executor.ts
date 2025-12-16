import { getToolDefinitions, executeTool, ToolContext } from "./agent-tools.js";

const GROQ_MODEL = "llama-3.3-70b-versatile";

function getGroqClient() {
  const Groq = require("groq-sdk").default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface AgentExecutorResult {
  success: boolean;
  message: string;
  action: string;
  updatedProject?: any;
  toolsUsed: string[];
  iterations: number;
}

const MAX_ITERATIONS = 8;

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  context: ToolContext
): Promise<AgentExecutorResult> {
  const client = getGroqClient();
  const toolDefinitions = getToolDefinitions();
  const toolsUsed: string[] = [];
  
  const messages: AgentMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];
  
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`[AgentExecutor] Iteration ${iterations}`);
    
    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: messages as any,
        tools: toolDefinitions,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 16000
      });
      
      const assistantMessage = response.choices[0].message;
      
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls
        });
        
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};
          
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch (e) {
            console.error(`[AgentExecutor] Failed to parse tool args:`, toolCall.function.arguments);
          }
          
          console.log(`[AgentExecutor] Calling tool: ${toolName}`, toolArgs);
          toolsUsed.push(toolName);
          
          const toolResult = await executeTool(toolName, toolArgs, context);
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        continue;
      }
      
      const content = assistantMessage.content || "";
      
      let jsonStr = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          let fixedJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
          const parsed = JSON.parse(fixedJson);
          
          return {
            success: true,
            message: parsed.message || content,
            action: parsed.action || "built_module",
            updatedProject: parsed.updatedProject,
            toolsUsed,
            iterations
          };
        } catch (e) {
          console.error(`[AgentExecutor] Failed to parse final JSON:`, e);
        }
      }
      
      return {
        success: true,
        message: content,
        action: "info",
        toolsUsed,
        iterations
      };
      
    } catch (e: any) {
      console.error(`[AgentExecutor] Error in iteration ${iterations}:`, e);
      
      if (e?.message?.includes("rate_limit") || e?.message?.includes("429")) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      return {
        success: false,
        message: `Agent error: ${e?.message || String(e)}`,
        action: "error",
        toolsUsed,
        iterations
      };
    }
  }
  
  return {
    success: false,
    message: "Agent reached maximum iterations without completing",
    action: "error",
    toolsUsed,
    iterations
  };
}

export function createAgentSystemPrompt(projectInfo: {
  name: string;
  domain: string;
  database: string;
  existingModules: string[];
  existingTables: string[];
}): string {
  return `You are an INTELLIGENT AI development agent that builds software modules. You have access to tools to inspect the project before building.

CRITICAL BEHAVIOR:
1. BEFORE building any module, use tools to understand the current project state:
   - Use get_project_info to see existing modules and tables
   - Use list_database_tables to see what's actually in the database
   - Use get_domain_knowledge to understand domain-specific schemas

2. BUILD modules that FIT with existing code:
   - Create tables that reference existing tables with proper foreign keys
   - Don't duplicate tables that already exist
   - Follow the naming conventions already in use

3. When user says "build X", you should:
   - First check what exists (use tools)
   - Then build the module with proper relationships
   - Return the complete module specification

PROJECT CONTEXT:
- Name: ${projectInfo.name}
- Domain: ${projectInfo.domain}
- Database: ${projectInfo.database}
- Existing Modules: ${projectInfo.existingModules.join(', ') || 'None'}
- Existing Tables: ${projectInfo.existingTables.join(', ') || 'None'}

AVAILABLE TOOLS (use them to be smart about what you build):

READING TOOLS:
- get_project_info: Get project details, modules, and existing tables
- list_database_tables: See actual database tables with columns
- get_table_data: Sample data from a table
- list_project_files: See generated code files
- read_file: Read a specific file
- get_domain_knowledge: Get domain-specific table/relationship schemas

VERIFICATION TOOLS (use to check your work):
- run_typescript_check: Check generated code for type errors
- test_api_endpoint: Call an API endpoint to verify it works
- read_app_logs: Read application logs to check for errors
- check_file_syntax: Check a specific file for syntax errors
- get_app_status: Check if the app is running

WRITE TOOLS (use to fix issues):
- write_file: Create or update a file in the project
- execute_sql: Run a SQL query on the project database

SELF-CORRECTION WORKFLOW:
1. After building a module, use run_typescript_check to verify code compiles
2. If there are errors, use write_file to fix them
3. Test the API endpoint with test_api_endpoint
4. Read logs if something fails with read_app_logs
5. Only return success when everything works

After gathering information, return your response as JSON:
{
  "message": "I'll build the [Module Name] for you. Based on the existing [X], I'm adding [Y] with relationships to [Z].",
  "action": "built_module",
  "updatedProject": {
    "modules": [
      {
        "name": "Module Name",
        "description": "What this module does",
        "status": "completed",
        "tables": [
          {"name": "table_name", "columns": [{"name": "id", "type": "serial", "primaryKey": true}, {"name": "foreign_id", "type": "integer", "references": "existing_table.id"}]}
        ],
        "apis": [{"method": "GET", "path": "/api/resource", "description": "List all"}],
        "screens": [{"name": "ResourceList", "type": "list", "route": "/resources"}]
      }
    ]
  },
  "nextSteps": ["Suggested next action"]
}`;
}
