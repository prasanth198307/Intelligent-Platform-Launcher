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

ALWAYS include these RBAC tables:
- users (id, email, password_hash, full_name, is_active, last_login, created_at, updated_at)
- roles (id, name, description, is_system, created_at)
- permissions (id, name, resource, action, description)
- role_permissions (id, role_id FK roles.id, permission_id FK permissions.id)
- user_roles (id, user_id FK users.id, role_id FK roles.id, assigned_at, assigned_by FK users.id)
- audit_logs (id, user_id FK users.id, action, entity_type, entity_id, changes jsonb, ip_address, created_at)

${context.domain === 'healthcare' ? `For healthcare domain, MUST include:
- patients (id, mrn, first_name, last_name, date_of_birth, gender, ssn_encrypted, address, phone, email, insurance_id, created_at, updated_at)
- encounters (id, patient_id FK patients.id, provider_id FK users.id, encounter_date, type, chief_complaint, diagnosis_codes jsonb, notes)
- case_sheets (id, patient_id FK patients.id, provider_id FK users.id, case_number unique, case_date, chief_complaint, present_illness, examination_findings, diagnosis, treatment_plan, follow_up_date, status, created_at, updated_at)
- medicines (id, name, generic_name, category, dosage_form, strength, manufacturer, is_active)
- prescriptions (id, case_sheet_id FK case_sheets.id, patient_id FK patients.id, medicine_id FK medicines.id, dosage, frequency, duration, instructions, prescribed_by FK users.id, prescribed_at)
- patient_history (id, patient_id FK patients.id, history_type, description, onset_date, is_current, notes, recorded_by FK users.id, recorded_at)
- patient_documents (id, patient_id FK patients.id, document_type, file_name, file_path, mime_type, file_size_bytes, upload_date, source, ocr_status, ocr_text)
- lab_results (id, patient_id FK patients.id, encounter_id FK encounters.id, test_name, result_value, unit, reference_range, abnormal_flag, result_date)
- medications (id, patient_id FK patients.id, drug_name, dosage, frequency, prescriber_id FK users.id, start_date, end_date, status)
` : ''}
Return JSON: { "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "primary"?: boolean, "unique"?: boolean, "foreignKey"?: string }] }] }`,

    tests: `Generate test cases for a ${context.domain} application.
Compliance requirements: ${context.compliance.join(", ") || "standard"}.
Return JSON: { "tests": [{ "name": string, "type": "unit"|"integration"|"e2e"|"security", "coverage": string[] }] }`,

    all: `Generate complete specifications for a ${context.domain} application.
Entities: ${context.entityCount}, Daily transactions: ${context.transactionsPerDay}
Database: ${context.database}, Compliance: ${context.compliance.join(", ") || "standard"}
Deployment: ${context.deploymentType}

For tables, ALWAYS include these RBAC tables:
- users, roles, permissions, role_permissions, user_roles, audit_logs

${context.domain === 'healthcare' ? `For healthcare domain, MUST include these tables:
- patients, encounters, case_sheets, medicines, prescriptions, patient_history, patient_documents, lab_results, medications
` : ''}

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
