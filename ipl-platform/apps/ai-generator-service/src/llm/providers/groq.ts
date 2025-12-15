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
Analyze these requirements carefully: "${context.requirements || ''}"

Based on the requirements, generate ALL necessary tables with proper relationships.

ALWAYS include these RBAC/core tables:
- users (id uuid primary, email unique, password_hash, full_name, is_active boolean, last_login timestamptz, created_at, updated_at)
- roles (id uuid primary, name unique, description, is_system boolean, created_at)
- permissions (id uuid primary, name unique, resource, action, description)
- role_permissions (id uuid primary, role_id FK roles.id, permission_id FK permissions.id)
- user_roles (id uuid primary, user_id FK users.id, role_id FK roles.id, assigned_at, assigned_by FK users.id)
- audit_logs (id bigserial primary, user_id FK users.id, action, entity_type, entity_id, changes jsonb, ip_address, created_at)

Then analyze the requirements text and generate domain-specific tables. Examples:
- If requirements mention patients/medical/clinic → include patients, encounters, case_sheets, medicines, prescriptions, lab_results tables
- If requirements mention meters/readings/billing → include meters, meter_readings, billing_cycles, invoices tables
- If requirements mention orders/products/inventory → include products, orders, order_items, inventory tables
- If requirements mention documents/files/upload → include documents, document_extractions tables with OCR fields

Generate comprehensive tables with proper foreign key relationships based on what the user describes.
Return JSON: { "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "primary"?: boolean, "unique"?: boolean, "foreignKey"?: string }] }] }`,

    tests: `Generate test cases for a ${context.domain} application.
Compliance requirements: ${context.compliance.join(", ") || "standard"}.
Return JSON: { "tests": [{ "name": string, "type": "unit"|"integration"|"e2e"|"security", "coverage": string[] }] }`,

    all: `Generate complete specifications for a ${context.domain} application.
Entities: ${context.entityCount}, Daily transactions: ${context.transactionsPerDay}
Database: ${context.database}, Compliance: ${context.compliance.join(", ") || "standard"}
Deployment: ${context.deploymentType}

REQUIREMENTS TO ANALYZE:
"${context.requirements || ''}"

Based on these requirements, generate modules, screens, tables, and tests.

For tables, ALWAYS include RBAC tables (users, roles, permissions, role_permissions, user_roles, audit_logs).
Then generate domain-specific tables based on what the requirements describe:
- Analyze keywords in requirements (patients, meters, orders, products, etc.)
- Create appropriate tables with proper foreign key relationships
- Include all columns needed for the functionality described

Return JSON with these sections:
{
  "modules": [{ "name": string, "description": string, "priority": "core"|"standard" }],
  "screens": [{ "name": string, "type": string, "description": string }],
  "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "primary"?: boolean, "unique"?: boolean, "foreignKey"?: string }] }],
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
