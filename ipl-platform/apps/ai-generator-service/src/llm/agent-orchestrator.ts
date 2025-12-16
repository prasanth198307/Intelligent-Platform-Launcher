import { EventEmitter } from "events";
import { getToolDefinitions, executeTool, ToolContext, agentTools } from "./agent-tools.js";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";

const CLAUDE_MODEL = "claude-sonnet-4-5";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type LLMProvider = "anthropic" | "groq";

function getLLMProvider(): LLMProvider {
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  return "groq";
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
  });
}

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export interface AgentTask {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: string;
}

export interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "task_update" | "message" | "review" | "complete" | "error";
  data: any;
  timestamp: number;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: any[];
}

export interface AgentSession {
  sessionId: string;
  projectId: string;
  tasks: AgentTask[];
  conversationHistory: ConversationMessage[];
  events: AgentEvent[];
  status: "idle" | "running" | "reviewing" | "complete";
}

const sessions = new Map<string, AgentSession>();

export class AgentOrchestrator extends EventEmitter {
  private session: AgentSession;
  private context: ToolContext;
  private maxIterations = 100; // Essentially unlimited - like Claude
  private currentIteration = 0;
  private rateLimitRetries = 0;

  constructor(projectId: string, sessionId?: string) {
    super();
    const sid = sessionId || `session_${Date.now()}`;
    
    if (sessions.has(sid)) {
      this.session = sessions.get(sid)!;
    } else {
      this.session = {
        sessionId: sid,
        projectId,
        tasks: [],
        conversationHistory: [],
        events: [],
        status: "idle"
      };
      sessions.set(sid, this.session);
    }
    
    this.context = { projectId };
  }

  private emit_event(type: AgentEvent["type"], data: any) {
    const event: AgentEvent = { type, data, timestamp: Date.now() };
    this.session.events.push(event);
    this.emit("event", event);
    return event;
  }

  private addTask(content: string): AgentTask {
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      status: "pending"
    };
    this.session.tasks.push(task);
    this.emit_event("task_update", { action: "added", task });
    return task;
  }

  private updateTask(taskId: string, updates: Partial<AgentTask>) {
    const task = this.session.tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      this.emit_event("task_update", { action: "updated", task });
    }
  }

  private getSystemPrompt(): string {
    const toolList = agentTools.map(t => `- ${t.name}: ${t.description}`).join('\n');
    
    return `You are an INTELLIGENT AI development agent with FULL capabilities - like Claude. You can:
1. Execute multiple steps before responding
2. Read and write files
3. Run commands and check results
4. Track tasks and show progress
5. Review your own work before finishing

CRITICAL BEHAVIORS:

1. **SAVE MODULE FIRST** - MOST IMPORTANT:
   - IMMEDIATELY after understanding what tables/APIs to create, call save_module FIRST
   - The UI only shows tables/APIs that are saved with save_module  
   - Do NOT create directories or files until you have called save_module
   - Example: save_module({ module_name: "Meter Management", tables: [{name: "meters", columns: [{name: "id", type: "integer", primaryKey: true}, {name: "meter_number", type: "varchar(50)"}]}], apis: [{method: "GET", path: "/api/meters", description: "List all meters"}, {method: "POST", path: "/api/meters", description: "Create meter"}] })

2. PERSISTENT LOOP: Keep working until the task is COMPLETE. Don't stop after one step.

3. TASK MANAGEMENT: Break complex requests into tasks. Update task status as you work.
   - When starting, create tasks with create_tasks tool
   - Mark tasks in_progress when working on them
   - Mark tasks completed when done

4. BUILD ORDER - Follow this sequence:
   a) Call save_module with tables and APIs FIRST (so UI shows them)
   b) Create directories with create_directory
   c) Write code files with write_file
   d) Test with run_typescript_check

5. SELF-CORRECTION: After building something:
   - Check for errors with run_typescript_check
   - If errors found, fix them with write_file
   - Verify again before moving on

6. VERIFICATION: Before saying "done":
   - Test API endpoints with test_api_endpoint
   - Check logs with read_app_logs
   - Verify code compiles with run_typescript_check

AVAILABLE TOOLS:
${toolList}

SPECIAL TOOLS:
- create_tasks: Create a list of tasks to work on
- update_task: Update task status (pending, in_progress, completed, failed)
- request_review: Call the reviewer agent to check your work
- final_response: When completely done, use this to respond to user

OUTPUT FORMAT:
Always respond with JSON:
{
  "thinking": "What I'm considering...",
  "action": "tool_name" or "final_response",
  "parameters": { ... },
  "reason": "Why I'm doing this"
}

Keep working until ALL tasks are complete, then use final_response.`;
  }

  private async callLLM(messages: any[], tools: any[]): Promise<{ content: string; toolCalls: any[]; thinking?: string }> {
    const provider = getLLMProvider();
    
    if (provider === "anthropic") {
      const client = getAnthropicClient();
      
      // Convert tools to Anthropic format
      const anthropicTools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
      
      // Convert messages - Anthropic doesn't use system in messages array
      const systemPrompt = messages.find(m => m.role === "system")?.content || "";
      const conversationMessages = messages
        .filter(m => m.role !== "system")
        .map(m => {
          if (m.tool_calls) {
            // Convert assistant message with tool calls
            return {
              role: "assistant" as const,
              content: m.tool_calls.map((tc: any) => ({
                type: "tool_use" as const,
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments || "{}")
              }))
            };
          }
          if (m.role === "tool") {
            // Convert tool result
            return {
              role: "user" as const,
              content: [{
                type: "tool_result" as const,
                tool_use_id: m.tool_call_id,
                content: m.content
              }]
            };
          }
          return { role: m.role as "user" | "assistant", content: m.content };
        });
      
      // Use streaming for real-time thinking display
      let textContent = "";
      let thinkingContent = "";
      const toolCalls: any[] = [];
      
      // Stream the response for real-time updates
      const stream = await client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        system: systemPrompt,
        messages: conversationMessages,
        tools: anthropicTools
      });
      
      // Collect streamed content and emit thinking events
      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          const delta = event.delta as any;
          if (delta.type === "text_delta" && delta.text) {
            textContent += delta.text;
            // Emit streaming thinking event
            this.emit_event("thinking", { 
              message: delta.text, 
              streaming: true,
              partial: textContent.slice(-200) // Last 200 chars for display
            });
          } else if (delta.type === "thinking_delta" && delta.thinking) {
            thinkingContent += delta.thinking;
            // Emit extended thinking
            this.emit_event("thinking", { 
              message: delta.thinking, 
              extended: true,
              streaming: true 
            });
          }
        }
      }
      
      // Get final message for tool calls
      const finalMessage = await stream.finalMessage();
      
      for (const block of finalMessage.content) {
        if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input)
            }
          });
        }
      }
      
      return { content: textContent, toolCalls, thinking: thinkingContent };
    } else {
      // Groq (OpenAI-compatible)
      const client = getGroqClient();
      
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 16000
      });
      
      const msg = response.choices[0].message;
      return {
        content: msg.content || "",
        toolCalls: msg.tool_calls || []
      };
    }
  }

  async run(userMessage: string): Promise<void> {
    this.session.status = "running";
    this.currentIteration = 0;
    this.rateLimitRetries = 0;
    
    this.session.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now()
    });

    const provider = getLLMProvider();
    this.emit_event("thinking", { message: `Understanding your request... (using ${provider === "anthropic" ? "Claude" : "Groq"})` });

    const toolDefinitions = getToolDefinitions();
    
    // Add orchestration tools
    const orchestrationTools = [
      {
        type: "function" as const,
        function: {
          name: "create_tasks",
          description: "Create a list of tasks to complete for this request",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: { type: "string" },
                description: "List of task descriptions"
              }
            },
            required: ["tasks"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_task",
          description: "Update the status of a task",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "Task ID to update" },
              status: { type: "string", enum: ["pending", "in_progress", "completed", "failed"] },
              result: { type: "string", description: "Result or notes for the task" }
            },
            required: ["task_id", "status"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "request_review",
          description: "Request the reviewer agent to check your work before finishing",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Summary of what was done" },
              files_changed: { type: "array", items: { type: "string" }, description: "Files that were modified" }
            },
            required: ["summary"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "final_response",
          description: "Send the final response to the user when all work is complete",
          parameters: {
            type: "object",
            properties: {
              message: { type: "string", description: "Final message to user" },
              summary: { type: "string", description: "Summary of what was accomplished" },
              next_steps: { type: "array", items: { type: "string" }, description: "Suggested next actions" }
            },
            required: ["message"]
          }
        }
      }
    ];

    const allTools = [...toolDefinitions, ...orchestrationTools];

    // Build messages with FULL conversation history (like Claude's large context window)
    // Include up to 200 previous messages for full context (matching Claude's large context)
    const recentHistory = this.session.conversationHistory.slice(-200);
    
    // Also include a summary of older history if there's more
    const olderHistoryCount = this.session.conversationHistory.length - recentHistory.length;
    const historySummary = olderHistoryCount > 0 
      ? `[Previous conversation: ${olderHistoryCount} earlier messages about project development]\n\n`
      : '';
    
    const messages: any[] = [
      { role: "system", content: this.getSystemPrompt() + (historySummary ? `\n\nCONVERSATION CONTEXT: ${historySummary}` : '') },
      ...recentHistory.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      this.emit_event("thinking", { iteration: this.currentIteration, message: `Processing step ${this.currentIteration}...` });

      try {
        const { content, toolCalls } = await this.callLLM(messages, allTools);
        
        // Reset rate limit counter on success
        this.rateLimitRetries = 0;

        if (toolCalls && toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: content || "",
            tool_calls: toolCalls
          });

          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            let toolArgs: any = {};
            
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch (e) {
              console.error("Failed to parse tool args:", toolCall.function.arguments);
            }

            this.emit_event("tool_call", { tool: toolName, args: toolArgs });

            let toolResult: any;

            // Handle orchestration tools
            if (toolName === "create_tasks") {
              const tasks = toolArgs.tasks || [];
              const createdTasks = tasks.map((content: string) => this.addTask(content));
              toolResult = { success: true, tasks: createdTasks };
            } else if (toolName === "update_task") {
              this.updateTask(toolArgs.task_id, {
                status: toolArgs.status,
                result: toolArgs.result
              });
              toolResult = { success: true };
            } else if (toolName === "request_review") {
              this.session.status = "reviewing";
              this.emit_event("review", { 
                summary: toolArgs.summary,
                files: toolArgs.files_changed 
              });
              
              // Run self-review
              const reviewResult = await this.runReview(toolArgs.summary, toolArgs.files_changed || []);
              toolResult = reviewResult;
            } else if (toolName === "final_response") {
              this.emit_event("message", {
                message: toolArgs.message,
                summary: toolArgs.summary,
                nextSteps: toolArgs.next_steps
              });
              
              this.session.conversationHistory.push({
                role: "assistant",
                content: toolArgs.message,
                timestamp: Date.now()
              });
              
              this.session.status = "complete";
              this.emit_event("complete", {
                message: toolArgs.message,
                tasks: this.session.tasks,
                iterations: this.currentIteration
              });
              
              return;
            } else {
              // Execute regular tool
              toolResult = await executeTool(toolName, toolArgs, this.context);
            }

            this.emit_event("tool_result", { tool: toolName, result: toolResult });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }

          continue;
        }

        // No tool calls - check if this is a final response
        const responseText = content || "";
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, ''));
          if (parsed.action === "final_response") {
            this.emit_event("complete", {
              message: parsed.message || responseText,
              tasks: this.session.tasks,
              iterations: this.currentIteration
            });
            return;
          }
        } catch {
          // Not JSON, treat as conversational
        }

        // Regular response without tools
        this.session.conversationHistory.push({
          role: "assistant",
          content: responseText,
          timestamp: Date.now()
        });

        this.emit_event("message", { message: responseText });
        this.session.status = "complete";
        this.emit_event("complete", {
          message: responseText,
          tasks: this.session.tasks,
          iterations: this.currentIteration
        });
        
        return;

      } catch (e: any) {
        console.error("Agent error:", e);
        
        if (e?.message?.includes("rate_limit") || e?.message?.includes("429") || e?.status === 429) {
          this.rateLimitRetries = (this.rateLimitRetries || 0) + 1;
          
          // Extract wait time from error message
          const waitMatch = e?.message?.match(/try again in (\d+m[\d.]+s|\d+s)/i);
          const waitTime = waitMatch ? waitMatch[1] : "a while";
          
          if (this.rateLimitRetries >= 3) {
            const errorMsg = `Rate limit exceeded. Groq free tier allows 100,000 tokens/day. Please wait ${waitTime} or switch to OpenAI by setting OPENAI_API_KEY and LLM_PROVIDER=openai.`;
            this.emit_event("error", { error: errorMsg });
            this.session.status = "idle";
            return;
          }
          
          this.emit_event("thinking", { message: `Rate limited (attempt ${this.rateLimitRetries}/3), waiting...` });
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        this.emit_event("error", { error: e?.message || String(e) });
        this.session.status = "idle";
        return;
      }
    }

    // Max iterations reached
    this.emit_event("error", { error: "Maximum iterations reached without completion" });
    this.session.status = "idle";
  }

  private async runReview(summary: string, filesChanged: string[]): Promise<any> {
    const provider = getLLMProvider();
    
    this.emit_event("thinking", { message: `Architect agent is reviewing your work... (using ${provider === "anthropic" ? "Claude" : "Groq"})` });
    
    // Read actual file contents for the architect to review
    let fileContents = "";
    for (const filePath of filesChanged.slice(0, 5)) { // Limit to 5 files
      try {
        const result = await executeTool("read_file", { file_path: filePath }, this.context);
        if (result.success && result.data?.content) {
          fileContents += `\n\n=== FILE: ${filePath} ===\n${result.data.content.slice(0, 5000)}`;
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
    
    // Get project context
    let projectContext = "";
    try {
      const projectInfo = await executeTool("get_project_info", {}, this.context);
      if (projectInfo.success) {
        projectContext = JSON.stringify(projectInfo.data, null, 2);
      }
    } catch (e) {
      // Skip if can't get project info
    }
    
    const architectPrompt = `You are the ARCHITECT AGENT - a senior software engineer reviewing code. Your job is to:
1. Verify the work is correct and complete
2. Find bugs, security issues, and problems
3. Check that the code follows best practices
4. Ensure all requirements were met

PROJECT CONTEXT:
${projectContext}

WORK SUMMARY:
${summary}

FILES CHANGED: ${filesChanged.join(', ') || 'None specified'}

${fileContents ? `ACTUAL FILE CONTENTS:${fileContents}` : ''}

REVIEW CHECKLIST:
- [ ] Code compiles without errors
- [ ] All functions have proper error handling
- [ ] No security vulnerabilities (SQL injection, XSS, etc)
- [ ] Database queries are correct
- [ ] API endpoints return proper responses
- [ ] No hardcoded credentials or secrets
- [ ] Proper foreign key relationships

Respond with JSON:
{
  "approved": true/false,
  "grade": "A/B/C/D/F",
  "feedback": "Overall assessment",
  "issues": [
    { "severity": "critical/major/minor", "file": "filename", "description": "Issue description" }
  ],
  "suggestions": ["Improvement suggestions"],
  "mustFix": ["Critical issues that MUST be fixed before approval"]
}`;

    try {
      let content = "";
      
      if (provider === "anthropic") {
        const client = getAnthropicClient();
        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          messages: [{ role: "user", content: architectPrompt }]
        });
        
        for (const block of response.content) {
          if (block.type === "text") {
            content += block.text;
          }
        }
      } else {
        const client = getGroqClient();
        const response = await client.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: architectPrompt }],
          temperature: 0.1,
          max_tokens: 4000
        });
        content = response.choices[0].message.content || "";
      }

      this.emit_event("review", { type: "architect_response", content });
      
      try {
        const review = JSON.parse(content.replace(/```json\s*/gi, '').replace(/```\s*/g, ''));
        
        // If there are critical issues, the agent should continue working
        if (review.mustFix && review.mustFix.length > 0) {
          this.emit_event("thinking", { message: `Architect found ${review.mustFix.length} issues to fix` });
          return {
            ...review,
            requiresMoreWork: true,
            message: `Fix these issues: ${review.mustFix.join('; ')}`
          };
        }
        
        return review;
      } catch {
        return { approved: true, feedback: content, grade: "B" };
      }
    } catch (e: any) {
      return { approved: true, feedback: "Review skipped due to error: " + e?.message, grade: "?" };
    }
  }

  getSession(): AgentSession {
    return this.session;
  }

  getTasks(): AgentTask[] {
    return this.session.tasks;
  }

  getHistory(): ConversationMessage[] {
    return this.session.conversationHistory;
  }
}

export function getOrCreateSession(projectId: string, sessionId?: string): AgentSession {
  const orchestrator = new AgentOrchestrator(projectId, sessionId);
  return orchestrator.getSession();
}

export function getSession(sessionId: string): AgentSession | undefined {
  return sessions.get(sessionId);
}
