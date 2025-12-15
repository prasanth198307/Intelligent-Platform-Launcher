#!/usr/bin/env bash
set -euo pipefail

w() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

# ---------------- ROOT ----------------
w package.json <<'JSON'
{
  "name": "ipl-platform",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "npm-run-all --parallel dev:ai dev:rule dev:workflow dev:connector",
    "dev:ai": "npm --prefix apps/ai-generator-service run dev",
    "dev:rule": "npm --prefix apps/rule-engine-service run dev",
    "dev:workflow": "npm --prefix apps/workflow-engine-service run dev",
    "dev:connector": "npm --prefix apps/connector-service run dev"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
JSON

w README.md <<'MD'
# IPL Platform (reconstructed)
## Services
- AI Generator: one message -> Canonical Spec (LLM) -> validate -> merge domain packs
- Rule Engine: stores/versions rules (stub ready to extend)
- Workflow Engine: runs workflows (stub ready to extend)
- Connector Service: integration gateway (stub ready to extend)

## Run
npm install
cp apps/ai-generator-service/.env.example apps/ai-generator-service/.env
npm run dev

## AI endpoints
- POST http://localhost:7100/api/generate-from-message-llm
- POST http://localhost:7100/api/generate-from-message (fallback, no LLM)
MD

# ---------------- DOMAIN PACKS ----------------
mkdir -p domain-packs/{ami,cis,healthcare,insurance,manufacturing,generic}

w domain-packs/ami/pack.json <<'JSON'
{
  "domain": "ami",
  "entities": [
    { "id": "meter", "name": "Meter", "table": "meter", "pii": false,
      "fields": [
        { "name": "meter_id", "type": "uuid", "required": true, "pk": true },
        { "name": "tenant_id", "type": "text", "required": true, "index": true },
        { "name": "serial_no", "type": "text", "required": true },
        { "name": "created_at", "type": "datetime", "required": true },
        { "name": "updated_at", "type": "datetime", "required": true }
      ]
    }
  ],
  "workflows": [],
  "rules": [
    {
      "ruleId": "tariff",
      "alias": "tariff.current",
      "version": 1,
      "dsl": "tariff",
      "body": { "type": "slab", "slabs": [
        { "from": 0, "to": 100, "rate": 3.0 },
        { "from": 101, "to": 300, "rate": 5.0 }
      ]},
      "tests": [
        { "name": "t1_50kwh", "input": { "kwh": 50 }, "expected": { "amount": 150 }, "assert": "equals" }
      ]
    }
  ],
  "connectors": { "ccb": { "actions": ["sync_accounts","fetch_bill","post_payment","post_adjustment"] } }
}
JSON

w domain-packs/cis/pack.json <<'JSON'
{ "domain":"cis",
  "entities":[
    { "id":"customer","name":"Customer","table":"customer","pii":true,
      "fields":[
        {"name":"customer_id","type":"uuid","required":true,"pk":true},
        {"name":"tenant_id","type":"text","required":true,"index":true},
        {"name":"name","type":"text","required":true},
        {"name":"created_at","type":"datetime","required":true},
        {"name":"updated_at","type":"datetime","required":true}
      ]
    }
  ],
  "workflows":[], "rules":[],
  "connectors":{ "ccb":{ "actions":["sync_accounts","fetch_bill","post_payment"] } }
}
JSON

w domain-packs/healthcare/pack.json <<'JSON'
{ "domain":"healthcare",
  "entities":[
    { "id":"patient","name":"Patient","table":"patient","pii":true,
      "fields":[
        {"name":"patient_id","type":"uuid","required":true,"pk":true},
        {"name":"tenant_id","type":"text","required":true,"index":true},
        {"name":"full_name","type":"text","required":true},
        {"name":"created_at","type":"datetime","required":true},
        {"name":"updated_at","type":"datetime","required":true}
      ]
    }
  ],
  "workflows":[], "rules":[],
  "connectors":{ "fhir":{ "actions":["push_patient","pull_patient","submit_claim"] } }
}
JSON

w domain-packs/insurance/pack.json <<'JSON'
{ "domain":"insurance",
  "entities":[
    { "id":"policy","name":"Policy","table":"policy","pii":false,
      "fields":[
        {"name":"policy_id","type":"uuid","required":true,"pk":true},
        {"name":"tenant_id","type":"text","required":true,"index":true},
        {"name":"status","type":"text","required":true},
        {"name":"created_at","type":"datetime","required":true},
        {"name":"updated_at","type":"datetime","required":true}
      ]
    }
  ],
  "workflows":[],
  "rules":[
    { "ruleId":"underwriting_score","alias":"underwriting_score.current","version":1,
      "dsl":"decision-table","body":{}, "tests":[]
    }
  ],
  "connectors":{ "payment":{ "actions":["collect_premium","refund"] } }
}
JSON

w domain-packs/manufacturing/pack.json <<'JSON'
{ "domain":"manufacturing",
  "entities":[
    { "id":"work_order","name":"Work Order","table":"work_order","pii":false,
      "fields":[
        {"name":"work_order_id","type":"uuid","required":true,"pk":true},
        {"name":"tenant_id","type":"text","required":true,"index":true},
        {"name":"status","type":"text","required":true},
        {"name":"created_at","type":"datetime","required":true},
        {"name":"updated_at","type":"datetime","required":true}
      ]
    }
  ],
  "workflows":[], "rules":[],
  "connectors":{ "erp":{ "actions":["push_work_order","pull_inventory"] } }
}
JSON

w domain-packs/generic/pack.json <<'JSON'
{ "domain":"generic","entities":[],"workflows":[],"rules":[],"connectors":{} }
JSON

# ---------------- AI GENERATOR SERVICE ----------------
mkdir -p apps/ai-generator-service/src/{canonicalSpec,llm/{prompts,providers},steps}

w apps/ai-generator-service/package.json <<'JSON'
{
  "name": "@ipl/ai-generator-service",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node --watch src/server.ts", "start": "node src/server.ts" },
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.24.1"
  }
}
JSON

w apps/ai-generator-service/.env.example <<'ENV'
PORT=7100
LLM_PROVIDER=

LLAMA_API_KEY=
LLAMA_BASE_URL=https://api.llama.com
LLAMA_MODEL=llama-3.1-70b-instruct

MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-large-latest
MIXTRAL_MODEL=open-mixtral-8x7b

CODELLAMA_BASE_URL=http://localhost:8000
CODELLAMA_API_KEY=
CODELLAMA_MODEL=codellama-34b-instruct

MYSTIC_ENDPOINT_URL=
MYSTIC_API_KEY=
MYSTIC_MODEL=custom
ENV

w apps/ai-generator-service/src/canonicalSpec/schema.ts <<'TS'
import { z } from "zod";
export const FieldType = z.enum(["uuid","text","number","date","datetime","boolean","json","reference"]);
export const CanonicalSpecSchema = z.object({
  specVersion: z.string().default("1.0"),
  app: z.object({
    name: z.string().min(2),
    description: z.string().optional().default(""),
    domain: z.array(z.enum(["ami","cis","healthcare","insurance","manufacturing","generic"])).min(1),
    platformMode: z.enum(["normal","enterprise"]).default("normal"),
    tenancyModel: z.enum(["shared-db","schema-per-tenant","db-per-tenant"]).default("shared-db"),
    dataResidency: z.string().nullable().optional().default(null)
  }),
  nonFunctional: z.object({
    scale: z.object({
      users: z.enum(["low","medium","high"]).default("low"),
      tps: z.enum(["low","medium","high"]).default("low"),
      dataVolume: z.enum(["low","medium","high"]).default("low"),
      latency: z.enum(["normal","low-latency"]).default("normal")
    }).default({}),
    availability: z.enum(["standard","ha","multi-region"]).default("standard"),
    compliance: z.array(z.enum(["none","soc2","hipaa","pci","gdpr","dpdp-india"])).default(["none"])
  }).default({}),
  dataModel: z.object({
    entities: z.array(z.any()).default([]),
    relations: z.array(z.any()).default([])
  }).default({}),
  rules: z.array(z.any()).default([]),
  workflows: z.array(z.any()).default([]),
  integrations: z.array(z.any()).default([]),
  ui: z.any().default({}),
  deployment: z.any().default({})
});
export type CanonicalSpec = z.infer<typeof CanonicalSpecSchema>;
TS

w apps/ai-generator-service/src/canonicalSpec/validate.ts <<'TS'
import { CanonicalSpecSchema } from "./schema.js";
export function validateCanonicalSpec(raw: unknown) {
  const parsed = CanonicalSpecSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues };
  const spec: any = parsed.data;
  const issues: any[] = [];
  for (const e of (spec.dataModel?.entities || [])) {
    const fields = e.fields || [];
    const hasTenant = fields.find((f:any)=>f.name==="tenant_id");
    if (!hasTenant) issues.push({ code:"TENANT_FIELD", message:`Entity ${e.id} missing tenant_id` });
  }
  if (issues.length) return { ok: false as const, issues };
  return { ok: true as const, spec };
}
TS

w apps/ai-generator-service/src/steps/domainPackLoader.ts <<'TS'
import fs from "fs";
import path from "path";
export function loadDomainPack(domain: string): any {
  const p = path.join(process.cwd(), "domain-packs", domain, "pack.json");
  if (!fs.existsSync(p)) return { entities: [], workflows: [], rules: [], connectors: {} };
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
TS

w apps/ai-generator-service/src/canonicalSpec/mergeDomainPacks.ts <<'TS'
import { loadDomainPack } from "../steps/domainPackLoader.js";
export function mergeDomainPacksIntoSpec(spec: any) {
  const entities = [...(spec.dataModel?.entities || [])];
  const workflows = [...(spec.workflows || [])];
  const rules = [...(spec.rules || [])];
  const integrations = [...(spec.integrations || [])];

  for (const d of spec.app.domain) {
    const pack = loadDomainPack(d);
    for (const pe of (pack.entities || [])) if (!entities.find(e=>e.id===pe.id)) entities.push(pe);
    for (const pw of (pack.workflows || [])) if (!workflows.find(w=>w.workflowId===pw.workflowId)) workflows.push(pw);
    for (const pr of (pack.rules || [])) if (!rules.find(r=>r.ruleId===pr.ruleId && r.version===pr.version)) rules.push(pr);
    const conns = pack.connectors || {};
    for (const key of Object.keys(conns)) {
      if (!integrations.find((i:any)=>i.id===key)) integrations.push({ id:key, type:key, actions:(conns[key].actions||[]).map((n:string)=>({name:n})) });
    }
  }

  return { ...spec, dataModel: { ...spec.dataModel, entities }, workflows, rules, integrations };
}
TS

# ---- LLM providers (Llama31 70B, Mistral/Mixtral, CodeLlama 34B, Mystic) ----
mkdir -p apps/ai-generator-service/src/llm/providers
w apps/ai-generator-service/src/llm/providers/types.ts <<'TS'
export type LlmProvider = "llama31-70b" | "mistral" | "mixtral-8x7b" | "codellama-34b" | "mystic";
export type LlmGenerateArgs = { system:string; user:string; jsonOnly:boolean; temperature?:number; maxTokens?:number };
export type LlmGenerateResult = { text:string; provider:LlmProvider; model:string };
export interface LlmClient { provider:LlmProvider; generate(args:LlmGenerateArgs): Promise<LlmGenerateResult>; }
TS

w apps/ai-generator-service/src/llm/providers/llama31_70b.ts <<'TS'
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class Llama31_70B_Client implements LlmClient {
  provider = "llama31-70b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.LLAMA_API_KEY; if (!apiKey) throw new Error("Missing LLAMA_API_KEY");
    const baseUrl = process.env.LLAMA_BASE_URL || "https://api.llama.com";
    const model = process.env.LLAMA_MODEL || "llama-3.1-70b-instruct";
    const r = await fetch(`${baseUrl}/v1/chat/completions`, { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.1, max_tokens: args.maxTokens ?? 2000,
        response_format: args.jsonOnly ? { type:"json_object" } : undefined
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
TS

w apps/ai-generator-service/src/llm/providers/mistral.ts <<'TS'
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class MistralClient implements LlmClient {
  provider = "mistral" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.MISTRAL_API_KEY; if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");
    const model = process.env.MISTRAL_MODEL || "mistral-large-latest";
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.2, max_tokens: args.maxTokens ?? 2000
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
export class Mixtral8x7BClient implements LlmClient {
  provider = "mixtral-8x7b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.MISTRAL_API_KEY; if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");
    const model = process.env.MIXTRAL_MODEL || "open-mixtral-8x7b";
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.2, max_tokens: args.maxTokens ?? 2000
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
TS

w apps/ai-generator-service/src/llm/providers/codellama34b.ts <<'TS'
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class CodeLlama34BClient implements LlmClient {
  provider = "codellama-34b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const baseUrl = process.env.CODELLAMA_BASE_URL; if (!baseUrl) throw new Error("Missing CODELLAMA_BASE_URL");
    const apiKey = process.env.CODELLAMA_API_KEY;
    const model = process.env.CODELLAMA_MODEL || "codellama-34b-instruct";
    const headers:any = { "Content-Type":"application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(`${baseUrl}/v1/chat/completions`, { method:"POST", headers,
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.1, max_tokens: args.maxTokens ?? 2500
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
TS

w apps/ai-generator-service/src/llm/providers/mystic.ts <<'TS'
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class MysticClient implements LlmClient {
  provider = "mystic" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const url = process.env.MYSTIC_ENDPOINT_URL; if (!url) throw new Error("Missing MYSTIC_ENDPOINT_URL");
    const apiKey = process.env.MYSTIC_API_KEY;
    const model = process.env.MYSTIC_MODEL || "custom";
    const headers:any = { "Content-Type":"application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(url, { method:"POST", headers,
      body: JSON.stringify({ prompt: `${args.system}\n\nUSER:\n${args.user}\n\nOUTPUT:`, json_only: args.jsonOnly })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.text ?? data?.output ?? data?.result ?? "", provider:this.provider, model };
  }
}
TS

w apps/ai-generator-service/src/llm/providerRouter.ts <<'TS'
import { Llama31_70B_Client } from "./providers/llama31_70b.js";
import { MistralClient, Mixtral8x7BClient } from "./providers/mistral.js";
import { CodeLlama34BClient } from "./providers/codellama34b.js";
import { MysticClient } from "./providers/mystic.js";

export function selectProvider(mode:"normal"|"enterprise") {
  const p = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (p === "llama31-70b" || p === "llama") return new Llama31_70B_Client();
  if (p === "mistral") return new MistralClient();
  if (p === "mixtral-8x7b" || p === "mixtral") return new Mixtral8x7BClient();
  if (p === "codellama-34b" || p === "codellama") return new CodeLlama34BClient();
  if (p === "mystic") return new MysticClient();
  return mode === "enterprise" ? new Llama31_70B_Client() : new Mixtral8x7BClient();
}
TS

mkdir -p apps/ai-generator-service/src/llm/prompts
w apps/ai-generator-service/src/llm/prompts/spec.system.txt <<'TXT'
Return ONLY valid JSON with fields:
- app:{name,description,domain[],platformMode,tenancyModel,dataResidency}
- dataModel:{entities[],relations[]}
- rules[], workflows[], integrations[], ui, deployment, nonFunctional
No markdown. No explanation.
TXT

w apps/ai-generator-service/src/llm/prompts/repair.system.txt <<'TXT'
Fix the JSON to satisfy the validation issues. Return ONLY corrected JSON.
TXT

w apps/ai-generator-service/src/llm/llmAdapter.ts <<'TS'
import fs from "fs";
import path from "path";
import { selectProvider } from "./providerRouter.js";
import { CanonicalSpecSchema } from "../canonicalSpec/schema.js";
import { validateCanonicalSpec } from "../canonicalSpec/validate.js";
import { mergeDomainPacksIntoSpec } from "../canonicalSpec/mergeDomainPacks.js";

function prompt(name:string){ return fs.readFileSync(path.join(process.cwd(),"apps","ai-generator-service","src","llm","prompts",name),"utf-8"); }

export async function oneMessageToValidatedSpec(message:string, mode:"normal"|"enterprise") {
  const client = selectProvider(mode);
  const sys = prompt("spec.system.txt");
  const res = await client.generate({ system: sys, user: message, jsonOnly: true });

  let spec = CanonicalSpecSchema.parse(JSON.parse(res.text));
  spec = mergeDomainPacksIntoSpec(spec);

  let v = validateCanonicalSpec(spec);
  let tries = 0;
  while (!v.ok && tries < 2) {
    const repairClient = selectProvider(mode);
    const repairSys = prompt("repair.system.txt");
    const payload = JSON.stringify({ message, issues: (v as any).issues, badSpec: spec }, null, 2);
    const repaired = await repairClient.generate({ system: repairSys, user: payload, jsonOnly: true, temperature: 0.1 });
    spec = CanonicalSpecSchema.parse(JSON.parse(repaired.text));
    spec = mergeDomainPacksIntoSpec(spec);
    v = validateCanonicalSpec(spec);
    tries++;
  }

  return v.ok ? { ok:true as const, spec:(v as any).spec } : { ok:false as const, issues:(v as any).issues, spec };
}
TS

w apps/ai-generator-service/src/server.ts <<'TS'
import express from "express";
import { oneMessageToValidatedSpec } from "./llm/llmAdapter.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
const PORT = Number(process.env.PORT || 7100);

app.get("/health", (_, res) => res.json({ ok:true, service:"ai-generator-service" }));

app.post("/api/generate-from-message-llm", async (req, res) => {
  const msg = String(req.body?.message || "").trim();
  if (!msg) return res.status(400).json({ error:"message required" });

  const lower = msg.toLowerCase();
  const mode = /(enterprise|hipaa|gdpr|dpdp|pci|soc2|regulated)/.test(lower) ? "enterprise" : "normal";

  try {
    const out = await oneMessageToValidatedSpec(msg, mode as any);
    if (!out.ok) return res.status(422).json(out);
    res.json(out);
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/generate-from-message", (req, res) => {
  res.status(400).json({ error:"Use /api/generate-from-message-llm (LLM-backed)."} );
});

app.listen(PORT, () => console.log(`AI Generator on :${PORT}`));
TS

# ---------------- STUB SERVICES ----------------
for svc in rule-engine-service workflow-engine-service connector-service; do
  mkdir -p "apps/$svc/src"
done

w apps/rule-engine-service/package.json <<'JSON'
{ "name":"@ipl/rule-engine-service","private":true,"type":"module",
  "scripts":{"dev":"node --watch src/server.ts"},
  "dependencies":{"express":"^4.19.2"}
}
JSON
w apps/rule-engine-service/src/server.ts <<'TS'
import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"rule-engine-service"}));
app.listen(7200,()=>console.log("Rule Engine on :7200"));
TS

w apps/workflow-engine-service/package.json <<'JSON'
{ "name":"@ipl/workflow-engine-service","private":true,"type":"module",
  "scripts":{"dev":"node --watch src/server.ts"},
  "dependencies":{"express":"^4.19.2"}
}
JSON
w apps/workflow-engine-service/src/server.ts <<'TS'
import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"workflow-engine-service"}));
app.listen(7300,()=>console.log("Workflow Engine on :7300"));
TS

w apps/connector-service/package.json <<'JSON'
{ "name":"@ipl/connector-service","private":true,"type":"module",
  "scripts":{"dev":"node --watch src/server.ts"},
  "dependencies":{"express":"^4.19.2"}
}
JSON
w apps/connector-service/src/server.ts <<'TS'
import express from "express";
const app = express(); app.use(express.json());
app.get("/health",(_,res)=>res.json({ok:true,service:"connector-service"}));
app.listen(7400,()=>console.log("Connector Service on :7400"));
TS

echo "✅ Repo created."
echo "Next:"
echo "  npm install"
echo "  cp apps/ai-generator-service/.env.example apps/ai-generator-service/.env"
echo "  npm run dev"
