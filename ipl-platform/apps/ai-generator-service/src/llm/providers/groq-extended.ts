import OpenAI from "openai";
import type { GenerationContext } from "../index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL
  });
};

export interface CodeGenerationRequest {
  context: GenerationContext;
  modules?: { name: string; description: string }[];
  screens?: { name: string; type: string }[];
  tables?: { name: string; columns: { name: string; type: string }[] }[];
  framework?: string;
  language?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

export interface CodeReviewResult {
  score: number;
  issues: {
    severity: "error" | "warning" | "info";
    line?: number;
    message: string;
    suggestion?: string;
  }[];
  summary: string;
  improvements: string[];
}

export interface CodeFixResult {
  originalCode: string;
  fixedCode: string;
  changes: { line: number; description: string }[];
  summary: string;
}

export async function groqGenerateApplicationCode(request: CodeGenerationRequest): Promise<{ files: GeneratedFile[] }> {
  const client = getClient();
  const { context, modules, screens, tables, framework = "react", language = "typescript" } = request;

  const tablesList = tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(", ")}`).join("\n") || "";
  const modulesList = modules?.map(m => `- ${m.name}: ${m.description}`).join("\n") || "";
  const screensList = screens?.map(s => `- ${s.name} (${s.type})`).join("\n") || "";

  const prompt = `Generate ${language} code for a ${context.domain.toUpperCase()} application.

Framework: ${framework}
Database: ${context.database}

${modulesList ? `Modules:\n${modulesList}` : ""}
${screensList ? `Screens:\n${screensList}` : ""}
${tablesList ? `Database Tables:\n${tablesList}` : ""}

Generate these files with COMPLETE code:
1. src/index.tsx - App entry point
2. src/App.tsx - Main component with routing
3. src/components/Dashboard.tsx - Dashboard for ${context.domain}
4. src/api/client.ts - API client
5. src/db/schema.ts - Drizzle ORM schema for the tables above
6. src/server/routes.ts - Express API routes

Return ONLY valid JSON:
{
  "files": [
    {"path": "src/index.tsx", "content": "...", "language": "typescript", "description": "..."},
    {"path": "src/App.tsx", "content": "...", "language": "typescript", "description": "..."},
    {"path": "src/components/Dashboard.tsx", "content": "...", "language": "typescript", "description": "..."},
    {"path": "src/api/client.ts", "content": "...", "language": "typescript", "description": "..."},
    {"path": "src/db/schema.ts", "content": "...", "language": "typescript", "description": "..."},
    {"path": "src/server/routes.ts", "content": "...", "language": "typescript", "description": "..."}
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    console.log("Generating application code with Groq...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert ${language} developer. Generate complete, production-ready code.
Return ONLY valid JSON with the files array. No markdown, no explanation.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty Groq response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function groqReviewCode(code: string, language: string): Promise<CodeReviewResult> {
  const client = getClient();

  const prompt = `Review this ${language} code and provide feedback:

\`\`\`${language}
${code}
\`\`\`

Return JSON:
{
  "score": 0-100,
  "issues": [{"severity": "error"|"warning"|"info", "line": number, "message": "...", "suggestion": "..."}],
  "summary": "...",
  "improvements": ["..."]
}`;

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are a code reviewer. Return ONLY valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found");

  return JSON.parse(jsonMatch[0]);
}

export async function groqFixCode(code: string, issues: string[]): Promise<CodeFixResult> {
  const client = getClient();

  const prompt = `Fix these issues in the code:
Issues: ${issues.join(", ")}

Code:
${code}

Return JSON:
{
  "originalCode": "...",
  "fixedCode": "...",
  "changes": [{"line": number, "description": "..."}],
  "summary": "..."
}`;

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are a code fixer. Return ONLY valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found");

  return JSON.parse(jsonMatch[0]);
}

export async function groqExplainCode(code: string, language: string): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "Explain code clearly and concisely." },
      { role: "user", content: `Explain this ${language} code:\n\n${code}` }
    ],
    temperature: 0.3
  });

  return response.choices[0].message.content || "Unable to explain code.";
}
