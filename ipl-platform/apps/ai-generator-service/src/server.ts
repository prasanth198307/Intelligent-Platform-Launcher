import "dotenv/config";
import express from "express";
import { oneMessageToValidatedSpec } from "./llm/llmAdapter.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 7100);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-generator-service" });
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
    const out = await oneMessageToValidatedSpec(msg, mode);
    res.json(out);
  } catch (e: any) {
    console.error("LLM pipeline failed:", e);
    res.status(500).json({
      error: "LLM pipeline failed",
      details: e?.message || String(e)
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI Generator on :${PORT}`);
});

