import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { runLLM, runLLMForType, runGenerateCode, runReviewCode, runFixCode, runExplainCode } from "./llm/index.js";
import { db } from "./db/index.js";
import { workspaces } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  generateTerraform,
  generateCloudFormation,
  generateDockerfile,
  generateDockerCompose,
  generateKubernetes,
  generateHelmChart,
  generateGitHubActions,
  generateGitLabCI,
  generateJenkinsPipeline,
  generateOpenAPISpec,
  generateSQLMigration,
  generateDrizzleSchema,
  generateJWTAuth,
  generateOAuth,
  generateK6Script,
  generateJMeterConfig,
  generateSecurityChecklist,
  generateSecurityConfig,
  generateCostOptimizations,
  runBenchmark,
  generateBenchmarkReport,
  generateMobileApp,
  generateBackendApi,
} from "./generators/index.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8080);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

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

app.post("/api/generate-code", async (req, res) => {
  try {
    const { domain, entityCount, transactionsPerDay, database, compliance, deploymentType, modules, screens, tables, framework, language } = req.body;
    
    const context = {
      domain: domain || "custom",
      entityCount: entityCount || 10000,
      transactionsPerDay: transactionsPerDay || 50000,
      database: database || "postgresql",
      compliance: compliance || [],
      deploymentType: deploymentType || "cloud"
    };

    console.log("Generating application code for:", context.domain);
    const result = await runGenerateCode({ context, modules, screens, tables, framework, language });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Code generation failed:", e);
    res.status(500).json({ error: "Code generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/review-code", async (req, res) => {
  try {
    const { code, language, context } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "code is required" });
    }

    console.log("Reviewing code:", language || "typescript");
    const result = await runReviewCode(code, language || "typescript", context);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Code review failed:", e);
    res.status(500).json({ error: "Code review failed", details: e?.message || String(e) });
  }
});

app.post("/api/fix-code", async (req, res) => {
  try {
    const { code, language, issues } = req.body;
    
    if (!code || !issues || !Array.isArray(issues)) {
      return res.status(400).json({ error: "code and issues array are required" });
    }

    console.log("Fixing code with", issues.length, "issues");
    const result = await runFixCode(code, language || "typescript", issues);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Code fix failed:", e);
    res.status(500).json({ error: "Code fix failed", details: e?.message || String(e) });
  }
});

app.post("/api/explain-code", async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "code is required" });
    }

    console.log("Explaining code:", language || "typescript");
    const result = await runExplainCode(code, language || "typescript");
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Code explanation failed:", e);
    res.status(500).json({ error: "Code explanation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-infrastructure", async (req, res) => {
  try {
    const { type, domain, database, tier, appServers, dbReplicas, cacheNodes, region, projectName } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      database: database || "postgresql",
      tier: tier || "Medium",
      appServers: appServers || 2,
      dbReplicas: dbReplicas || 1,
      cacheNodes: cacheNodes || 1,
      region: region || "us-east-1",
      projectName: projectName,
    };
    
    let result: Record<string, string> = {};
    
    if (type === "all" || !type) {
      result = {
        terraform: generateTerraform(ctx),
        cloudformation: generateCloudFormation(ctx),
        dockerfile: generateDockerfile(ctx),
        dockerCompose: generateDockerCompose(ctx),
        kubernetes: generateKubernetes(ctx),
        helmChart: generateHelmChart(ctx),
      };
    } else {
      switch (type) {
        case "terraform":
          result.terraform = generateTerraform(ctx);
          break;
        case "cloudformation":
          result.cloudformation = generateCloudFormation(ctx);
          break;
        case "dockerfile":
          result.dockerfile = generateDockerfile(ctx);
          break;
        case "docker-compose":
          result.dockerCompose = generateDockerCompose(ctx);
          break;
        case "kubernetes":
          result.kubernetes = generateKubernetes(ctx);
          break;
        case "helm":
          result.helmChart = generateHelmChart(ctx);
          break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: terraform, cloudformation, dockerfile, docker-compose, kubernetes, helm, or all" });
      }
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Infrastructure generation failed:", e);
    res.status(500).json({ error: "Infrastructure generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-cicd", async (req, res) => {
  try {
    const { type, domain, projectName, language, registry, cloudProvider } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      projectName: projectName,
      language: language || "typescript",
      registry: registry,
      cloudProvider: cloudProvider || "aws",
    };
    
    let result: Record<string, string> = {};
    
    if (type === "all" || !type) {
      result = {
        githubActions: generateGitHubActions(ctx),
        gitlabCI: generateGitLabCI(ctx),
        jenkinsPipeline: generateJenkinsPipeline(ctx),
      };
    } else {
      switch (type) {
        case "github-actions":
          result.githubActions = generateGitHubActions(ctx);
          break;
        case "gitlab-ci":
          result.gitlabCI = generateGitLabCI(ctx);
          break;
        case "jenkins":
          result.jenkinsPipeline = generateJenkinsPipeline(ctx);
          break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: github-actions, gitlab-ci, jenkins, or all" });
      }
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("CI/CD generation failed:", e);
    res.status(500).json({ error: "CI/CD generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-api-docs", async (req, res) => {
  try {
    const { domain, projectName, tables, baseUrl } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: "tables array is required" });
    }
    
    const ctx = {
      domain: domain || "custom",
      projectName: projectName,
      tables: tables,
      baseUrl: baseUrl,
    };
    
    const openApiSpec = generateOpenAPISpec(ctx);
    
    res.json({ ok: true, openApiSpec: JSON.parse(openApiSpec) });
  } catch (e: any) {
    console.error("API docs generation failed:", e);
    res.status(500).json({ error: "API docs generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-migrations", async (req, res) => {
  try {
    const { type, domain, database, tables, projectName } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: "tables array is required" });
    }
    
    const ctx = {
      domain: domain || "custom",
      database: database || "postgresql",
      tables: tables,
      projectName: projectName,
    };
    
    let result: Record<string, string> = {};
    
    if (type === "all" || !type) {
      result = {
        sqlMigration: generateSQLMigration(ctx),
        drizzleSchema: generateDrizzleSchema(ctx),
      };
    } else {
      switch (type) {
        case "sql":
          result.sqlMigration = generateSQLMigration(ctx);
          break;
        case "drizzle":
          result.drizzleSchema = generateDrizzleSchema(ctx);
          break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: sql, drizzle, or all" });
      }
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Migration generation failed:", e);
    res.status(500).json({ error: "Migration generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-auth", async (req, res) => {
  try {
    const { type, domain, projectName, providers, mfa } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      projectName: projectName,
      providers: providers || ["google", "github"],
      mfa: mfa || false,
    };
    
    let result: Record<string, string> = {};
    
    if (type === "all" || !type) {
      result = {
        jwtAuth: generateJWTAuth(ctx),
        oAuth: generateOAuth(ctx),
      };
    } else {
      switch (type) {
        case "jwt":
          result.jwtAuth = generateJWTAuth(ctx);
          break;
        case "oauth":
          result.oAuth = generateOAuth(ctx);
          break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: jwt, oauth, or all" });
      }
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Auth generation failed:", e);
    res.status(500).json({ error: "Auth generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-load-tests", async (req, res) => {
  try {
    const { type, domain, projectName, baseUrl, targetRPS, duration, endpoints } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      projectName: projectName,
      baseUrl: baseUrl || "http://localhost:3000",
      targetRPS: targetRPS || 100,
      duration: duration || "5m",
      endpoints: endpoints,
    };
    
    let result: Record<string, string> = {};
    
    if (type === "all" || !type) {
      result = {
        k6Script: generateK6Script(ctx),
        jmeterConfig: generateJMeterConfig(ctx),
      };
    } else {
      switch (type) {
        case "k6":
          result.k6Script = generateK6Script(ctx);
          break;
        case "jmeter":
          result.jmeterConfig = generateJMeterConfig(ctx);
          break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: k6, jmeter, or all" });
      }
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Load test generation failed:", e);
    res.status(500).json({ error: "Load test generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/security-scan", async (req, res) => {
  try {
    const { domain, projectName, compliance, deploymentType } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      projectName: projectName,
      compliance: compliance || [],
      deploymentType: deploymentType || "cloud",
    };
    
    const report = generateSecurityChecklist(ctx);
    const securityConfig = generateSecurityConfig(ctx);
    
    res.json({ ok: true, report, securityConfig });
  } catch (e: any) {
    console.error("Security scan failed:", e);
    res.status(500).json({ error: "Security scan failed", details: e?.message || String(e) });
  }
});

app.post("/api/cost-optimization", async (req, res) => {
  try {
    const { domain, tier, cloudProvider, currentCost, appServers, dbReplicas, cacheNodes, storageGB, monthlyEgressGB } = req.body;
    
    const ctx = {
      domain: domain || "custom",
      tier: tier || "Medium",
      cloudProvider: cloudProvider || "aws",
      currentCost: currentCost || 5000,
      appServers: appServers || 2,
      dbReplicas: dbReplicas || 1,
      cacheNodes: cacheNodes || 1,
      storageGB: storageGB || 1000,
      monthlyEgressGB: monthlyEgressGB || 500,
    };
    
    const report = generateCostOptimizations(ctx);
    
    res.json({ ok: true, ...report });
  } catch (e: any) {
    console.error("Cost optimization failed:", e);
    res.status(500).json({ error: "Cost optimization failed", details: e?.message || String(e) });
  }
});

app.post("/api/run-benchmark", async (req, res) => {
  try {
    const { targetUrl, method, headers, body, concurrentUsers, duration, rampUp } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "targetUrl is required" });
    }
    
    const config = {
      targetUrl,
      method: method || 'GET',
      headers: headers || {},
      body: body || '',
      concurrentUsers: concurrentUsers || 10,
      duration: duration || 30,
      rampUp: rampUp || 5,
    };
    
    const result = await runBenchmark(config as any);
    const report = generateBenchmarkReport(result, config as any);
    
    res.json({ ...result, report });
  } catch (e: any) {
    console.error("Benchmark failed:", e);
    res.status(500).json({ error: "Benchmark failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-mobile-app", async (req, res) => {
  try {
    const { domain, projectName, platforms, features, modules, screens, tables, framework, authentication, offlineSync, pushNotifications } = req.body;
    
    const config = {
      domain: domain || "custom",
      projectName: projectName || `${domain}App`,
      platforms: platforms || ['ios', 'android'],
      features: features || ['Offline Support', 'Push Notifications'],
      modules: modules || [],
      screens: screens || [],
      tables: tables || [],
      framework: framework || 'expo',
      authentication: authentication !== false,
      offlineSync: offlineSync !== false,
      pushNotifications: pushNotifications !== false,
    };
    
    const result = generateMobileApp(config as any);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Mobile app generation failed:", e);
    res.status(500).json({ error: "Mobile app generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-backend", async (req, res) => {
  try {
    const { framework, domain, database, projectName, tables, authentication, port } = req.body;
    
    if (!framework || !['nodejs', 'python', 'go'].includes(framework)) {
      return res.status(400).json({ error: "framework is required (nodejs, python, or go)" });
    }
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: "tables array is required with at least one table" });
    }
    
    const config = {
      framework: framework as 'nodejs' | 'python' | 'go',
      domain: domain || "custom",
      database: database || "postgresql",
      projectName: projectName,
      tables: tables,
      authentication: authentication !== false,
      port: port,
    };
    
    const result = generateBackendApi(config);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Backend API generation failed:", e);
    res.status(500).json({ error: "Backend API generation failed", details: e?.message || String(e) });
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
    const { sessionId, ...data } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    
    const [existing] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    
    if (!existing) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    
    if (existing.sessionId !== sessionId) {
      return res.status(403).json({ error: "Access denied" });
    }

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

    res.json({ ok: true, workspace });
  } catch (e: any) {
    console.error("Update workspace failed:", e);
    res.status(500).json({ error: "Failed to update workspace", details: e?.message || String(e) });
  }
});

app.get("/api/workspaces", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    
    const result = await db.select().from(workspaces).where(eq(workspaces.sessionId, sessionId)).orderBy(desc(workspaces.updatedAt));
    res.json({ ok: true, workspaces: result });
  } catch (e: any) {
    console.error("List workspaces failed:", e);
    res.status(500).json({ error: "Failed to list workspaces", details: e?.message || String(e) });
  }
});

app.get("/api/workspaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sessionId = req.query.sessionId as string;
    
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    
    if (sessionId && workspace.sessionId !== sessionId) {
      return res.status(403).json({ error: "Access denied" });
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
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    
    if (workspace.sessionId !== sessionId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.delete(workspaces).where(eq(workspaces.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("Delete workspace failed:", e);
    res.status(500).json({ error: "Failed to delete workspace", details: e?.message || String(e) });
  }
});

app.post("/api/parse-document", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const fileName = file.originalname.toLowerCase();
    let extractedText = "";
    
    if (fileName.endsWith(".pdf")) {
      const pdfData = await pdf(file.buffer);
      extractedText = pdfData.text;
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      extractedText = file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ 
        error: "Unsupported file type. Supported: PDF, DOCX, TXT, MD" 
      });
    }
    
    extractedText = extractedText.trim();
    
    if (!extractedText) {
      return res.status(400).json({ error: "No text could be extracted from the document" });
    }
    
    res.json({ 
      ok: true, 
      text: extractedText,
      fileName: file.originalname,
      fileSize: file.size,
      charCount: extractedText.length
    });
  } catch (e: any) {
    console.error("Document parsing failed:", e);
    res.status(500).json({ error: "Document parsing failed", details: e?.message || String(e) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Generator on :${PORT}`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER || "mock"}`);
  console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? "configured" : "not set (using mock)"}`);
});
