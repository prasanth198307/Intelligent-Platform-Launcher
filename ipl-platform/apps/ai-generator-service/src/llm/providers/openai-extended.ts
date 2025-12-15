import OpenAI from "openai";
import type { GenerationContext } from "../index.js";

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

export interface CodeGenerationRequest {
  context: GenerationContext;
  modules?: { name: string; description: string }[];
  screens?: { name: string; type: string }[];
  tables?: { name: string; columns: { name: string; type: string }[] }[];
  framework?: string;
  language?: string;
}

export interface CodeReviewRequest {
  code: string;
  language: string;
  context?: string;
}

export interface CodeFixRequest {
  code: string;
  language: string;
  issues: string[];
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

export async function generateApplicationCode(request: CodeGenerationRequest): Promise<{ files: GeneratedFile[] }> {
  const client = getClient();
  const { context, modules, screens, tables, framework = "react", language = "typescript" } = request;

  const prompt = `Generate production-ready ${language} code for a ${context.domain} application.

Framework: ${framework}
Database: ${context.database}
Deployment: ${context.deploymentType}
Compliance: ${context.compliance.join(", ") || "standard"}

${modules ? `Modules to implement:\n${modules.map(m => `- ${m.name}: ${m.description}`).join("\n")}` : ""}

${screens ? `UI Screens needed:\n${screens.map(s => `- ${s.name} (${s.type})`).join("\n")}` : ""}

${tables ? `Database tables:\n${tables.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(", ")}`).join("\n")}` : ""}

Generate the following files with COMPLETE, RUNNABLE code:
1. Main application entry point
2. Database schema/models
3. API routes/controllers
4. At least 2 UI components if React
5. Configuration files

Return JSON:
{
  "files": [
    {
      "path": "src/filename.ts",
      "content": "// Full file content here",
      "language": "typescript",
      "description": "What this file does"
    }
  ]
}

IMPORTANT: Generate COMPLETE, production-ready code. Not stubs or placeholders.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    console.log("Generating application code with OpenAI...");

    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert full-stack developer specializing in ${context.domain} applications.
Generate complete, production-ready code. No placeholders or TODOs.
Return ONLY valid JSON. No markdown or explanation.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
  const client = getClient();
  const { code, language, context } = request;

  const prompt = `Review this ${language} code for issues and best practices.

${context ? `Context: ${context}` : ""}

CODE TO REVIEW:
\`\`\`${language}
${code}
\`\`\`

Analyze for:
1. Bugs and potential errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Maintainability concerns

Return JSON:
{
  "score": 85,
  "issues": [
    {
      "severity": "error|warning|info",
      "line": 10,
      "message": "Issue description",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall assessment",
  "improvements": ["Suggestion 1", "Suggestion 2"]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    console.log("Reviewing code with OpenAI...");

    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a senior code reviewer with expertise in ${language}.
Be thorough but constructive. Focus on actionable feedback.
Return ONLY valid JSON.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fixCode(request: CodeFixRequest): Promise<CodeFixResult> {
  const client = getClient();
  const { code, language, issues } = request;

  const prompt = `Fix the following issues in this ${language} code:

ISSUES TO FIX:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

Return JSON with the fixed code:
{
  "originalCode": "...",
  "fixedCode": "Complete fixed code here",
  "changes": [
    { "line": 10, "description": "What was changed" }
  ],
  "summary": "Overview of all fixes applied"
}

IMPORTANT: Return the COMPLETE fixed code, not just the changed parts.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    console.log("Fixing code with OpenAI...");

    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert debugger and code fixer.
Apply all requested fixes while maintaining code functionality.
Return ONLY valid JSON.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function explainCode(code: string, language: string): Promise<{ explanation: string; concepts: string[] }> {
  const client = getClient();

  const prompt = `Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Return JSON:
{
  "explanation": "Detailed explanation of what this code does",
  "concepts": ["Concept 1", "Concept 2"]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a patient coding teacher. Explain code clearly for developers of all levels. Return ONLY valid JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}
