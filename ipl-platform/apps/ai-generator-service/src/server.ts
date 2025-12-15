import "dotenv/config";
import express from "express";
import cors from "cors";
import { runLLM, runLLMForType } from "./llm/index.js";
import { db } from "./db/index.js";
import { workspaces } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8080);

app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    service: "ai-generator-service",
    llmProvider: process.env.LLM_PROVIDER || "mock",
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { type, domain, entityCount, transactionsPerDay, database, compliance, deploymentType } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: "type is required (modules|screens|tables|tests|all)" });
    }

    const context = {
      domain: domain || "custom",
      entityCount: entityCount || 10000,
      transactionsPerDay: transactionsPerDay || 50000,
      database: database || "postgresql",
      compliance: compliance || [],
      deploymentType: deploymentType || "cloud"
    };

    const result = await runLLMForType(type, context);
    res.json({ ok: true, type, data: result });
  } catch (e: any) {
    console.error("Generation failed:", e);
    res.status(500).json({ error: "Generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-from-message-llm", async (req, res) => {
  const msg = String(req.body?.message || "").trim();
  if (!msg) return res.status(400).json({ error: "message required" });

  const lower = msg.toLowerCase();
  const mode =
    /(enterprise|hipaa|gdpr|dpdp|pci|soc2|regulated)/.test(lower)
      ? "enterprise"
      : "normal";

  console.log("Incoming message:", msg);
  console.log("Mode:", mode);

  try {
    const out = await runLLM(msg);
    res.json({ ok: true, mode, spec: out });
  } catch (e: any) {
    console.error("LLM pipeline failed:", e);
    res.status(500).json({
      error: "LLM pipeline failed",
      details: e?.message || String(e)
    });
  }
});

app.post("/api/workspaces", async (req, res) => {
  try {
    const { name, sessionId, ...data } = req.body;
    
    if (!name || !sessionId) {
      return res.status(400).json({ error: "name and sessionId are required" });
    }

    const [workspace] = await db.insert(workspaces).values({
      name,
      sessionId,
      domain: data.domain || "custom",
      database: data.database || "postgresql",
      entityCount: data.entityCount,
      transactionsPerDay: data.transactionsPerDay,
      compliance: data.compliance,
      deploymentType: data.deploymentType,
      multiTenant: data.multiTenant,
      multiLingual: data.multiLingual,
      crossDomain: data.crossDomain,
      modules: data.modules,
      screens: data.screens,
      tables: data.tables,
      tests: data.tests,
      integrations: data.integrations,
      scaffolding: data.scaffolding,
      infrastructure: data.infrastructure,
      costs: data.costs,
      security: data.security,
      clusterConfig: data.clusterConfig,
      mobileConfig: data.mobileConfig,
      status: data.status || "draft",
    }).returning();

    res.json({ ok: true, workspace });
  } catch (e: any) {
    console.error("Save workspace failed:", e);
    res.status(500).json({ error: "Failed to save workspace", details: e?.message || String(e) });
  }
});

app.put("/api/workspaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const [workspace] = await db.update(workspaces)
      .set({
        name: data.name,
        domain: data.domain,
        database: data.database,
        entityCount: data.entityCount,
        transactionsPerDay: data.transactionsPerDay,
        compliance: data.compliance,
        deploymentType: data.deploymentType,
        multiTenant: data.multiTenant,
        multiLingual: data.multiLingual,
        crossDomain: data.crossDomain,
        modules: data.modules,
        screens: data.screens,
        tables: data.tables,
        tests: data.tests,
        integrations: data.integrations,
        scaffolding: data.scaffolding,
        infrastructure: data.infrastructure,
        costs: data.costs,
        security: data.security,
        clusterConfig: data.clusterConfig,
        mobileConfig: data.mobileConfig,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json({ ok: true, workspace });
  } catch (e: any) {
    console.error("Update workspace failed:", e);
    res.status(500).json({ error: "Failed to update workspace", details: e?.message || String(e) });
  }
});

app.get("/api/workspaces", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    
    let result;
    if (sessionId) {
      result = await db.select().from(workspaces).where(eq(workspaces.sessionId, sessionId)).orderBy(desc(workspaces.updatedAt));
    } else {
      result = await db.select().from(workspaces).orderBy(desc(workspaces.updatedAt));
    }
    
    res.json({ ok: true, workspaces: result });
  } catch (e: any) {
    console.error("List workspaces failed:", e);
    res.status(500).json({ error: "Failed to list workspaces", details: e?.message || String(e) });
  }
});

app.get("/api/workspaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json({ ok: true, workspace });
  } catch (e: any) {
    console.error("Get workspace failed:", e);
    res.status(500).json({ error: "Failed to get workspace", details: e?.message || String(e) });
  }
});

app.delete("/api/workspaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(workspaces).where(eq(workspaces.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("Delete workspace failed:", e);
    res.status(500).json({ error: "Failed to delete workspace", details: e?.message || String(e) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Generator on :${PORT}`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER || "mock"}`);
  console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? "configured" : "not set (using mock)"}`);
});
