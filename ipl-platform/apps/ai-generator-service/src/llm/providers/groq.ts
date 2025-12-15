import OpenAI from "openai";
import type { GenerationContext } from "../index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.1-8b-instant";

export async function groqLLM(prompt: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.LLM_TIMEOUT_MS || 30000)
  );

  try {
    console.log("Groq LLM invoked");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an enterprise application architect.
Return ONLY valid JSON.
No explanation.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty Groq response");

    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

export async function groqLLMForType(type: string, context: GenerationContext) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL
  });

  const prompts: Record<string, string> = {
    modules: `Generate a list of software modules for a ${context.domain} application.
The application handles ${context.entityCount} entities and ${context.transactionsPerDay} transactions per day.
Database: ${context.database}. Compliance: ${context.compliance.join(", ") || "standard"}.
Return JSON: { "modules": [{ "name": string, "description": string, "priority": "core"|"standard"|"optional" }] }`,

    screens: `Generate UI screens for a ${context.domain} application.
The application handles ${context.entityCount} entities.
Return JSON: { "screens": [{ "name": string, "type": "list"|"form"|"detail"|"chart"|"map", "description": string }] }`,

    tables: `Generate database tables for a ${context.domain} application using ${context.database}.
Include appropriate data types for the database.
Return JSON: { "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "primary"?: boolean, "unique"?: boolean, "foreignKey"?: string }] }] }`,

    tests: `Generate test cases for a ${context.domain} application.
Compliance requirements: ${context.compliance.join(", ") || "standard"}.
Return JSON: { "tests": [{ "name": string, "type": "unit"|"integration"|"e2e"|"security", "coverage": string[] }] }`,

    all: `Generate complete specifications for a ${context.domain} application.
Entities: ${context.entityCount}, Daily transactions: ${context.transactionsPerDay}
Database: ${context.database}, Compliance: ${context.compliance.join(", ") || "standard"}
Deployment: ${context.deploymentType}

Return JSON with these sections:
{
  "modules": [{ "name": string, "description": string, "priority": "core"|"standard" }],
  "screens": [{ "name": string, "type": string, "description": string }],
  "tables": [{ "name": string, "columns": [{ "name": string, "type": string }] }],
  "tests": [{ "name": string, "type": string, "coverage": string[] }]
}`
  };

  const prompt = prompts[type] || prompts.all;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.LLM_TIMEOUT_MS || 30000)
  );

  try {
    console.log(`Groq LLM for type: ${type}`);

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an enterprise application architect specializing in ${context.domain} systems.
Generate realistic, production-ready specifications.
Return ONLY valid JSON. No explanation or markdown.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
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
