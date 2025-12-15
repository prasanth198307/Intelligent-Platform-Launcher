import "dotenv/config";
import express from "express";
import cors from "cors";
import { runLLM, runLLMForType } from "./llm/index.js";

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Generator on :${PORT}`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER || "mock"}`);
  console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? "configured" : "not set (using mock)"}`);
});
