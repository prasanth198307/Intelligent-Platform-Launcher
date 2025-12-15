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
  analyzeSchema,
  generateMigrationPlan,
  generateTargetDDL,
  generatePerformanceSuggestions,
  type SourceSchema,
  type MigrationConfig,
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

app.post("/api/migration/analyze", async (req, res) => {
  try {
    const { schema } = req.body;
    
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      return res.status(400).json({ error: "schema with tables array is required" });
    }

    const defaultSchema: SourceSchema = {
      tables: schema.tables || [],
      indexes: schema.indexes || [],
      constraints: schema.constraints || [],
      partitions: schema.partitions || [],
      views: schema.views || [],
      procedures: schema.procedures || [],
      triggers: schema.triggers || [],
    };

    const analysis = analyzeSchema(defaultSchema);
    res.json({ ok: true, ...analysis });
  } catch (e: any) {
    console.error("Schema analysis failed:", e);
    res.status(500).json({ error: "Schema analysis failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/plan", async (req, res) => {
  try {
    const { sourceDatabase, targetDatabase, schema, options } = req.body;
    
    if (!sourceDatabase || !targetDatabase) {
      return res.status(400).json({ error: "sourceDatabase and targetDatabase are required" });
    }
    
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      return res.status(400).json({ error: "schema with tables array is required" });
    }

    const sourceSchema: SourceSchema = {
      tables: schema.tables || [],
      indexes: schema.indexes || [],
      constraints: schema.constraints || [],
      partitions: schema.partitions || [],
      views: schema.views || [],
      procedures: schema.procedures || [],
      triggers: schema.triggers || [],
    };

    const config: MigrationConfig = {
      sourceDatabase,
      targetDatabase,
      sourceSchema,
      options: {
        preserveIndexes: options?.preserveIndexes !== false,
        convertProcedures: options?.convertProcedures !== false,
        preservePartitions: options?.preservePartitions !== false,
        parallelTables: options?.parallelTables || 4,
        batchSize: options?.batchSize || 10000,
      },
    };

    const plan = generateMigrationPlan(config);
    res.json({ ok: true, ...plan });
  } catch (e: any) {
    console.error("Migration plan generation failed:", e);
    res.status(500).json({ error: "Migration plan generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/convert-ddl", async (req, res) => {
  try {
    const { sourceDatabase, targetDatabase, schema } = req.body;
    
    if (!sourceDatabase || !targetDatabase) {
      return res.status(400).json({ error: "sourceDatabase and targetDatabase are required" });
    }
    
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      return res.status(400).json({ error: "schema with tables array is required" });
    }

    const sourceSchema: SourceSchema = {
      tables: schema.tables || [],
      indexes: schema.indexes || [],
      constraints: schema.constraints || [],
      partitions: schema.partitions || [],
      views: schema.views || [],
      procedures: schema.procedures || [],
      triggers: schema.triggers || [],
    };

    const result = generateTargetDDL(sourceSchema, sourceDatabase, targetDatabase);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("DDL conversion failed:", e);
    res.status(500).json({ error: "DDL conversion failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/performance-suggestions", async (req, res) => {
  try {
    const { targetDatabase, schema } = req.body;
    
    if (!targetDatabase) {
      return res.status(400).json({ error: "targetDatabase is required" });
    }
    
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      return res.status(400).json({ error: "schema with tables array is required" });
    }

    const sourceSchema: SourceSchema = {
      tables: schema.tables || [],
      indexes: schema.indexes || [],
      constraints: schema.constraints || [],
      partitions: schema.partitions || [],
      views: schema.views || [],
      procedures: schema.procedures || [],
      triggers: schema.triggers || [],
    };

    const suggestions = generatePerformanceSuggestions(sourceSchema, targetDatabase);
    res.json({ ok: true, suggestions });
  } catch (e: any) {
    console.error("Performance suggestions failed:", e);
    res.status(500).json({ error: "Performance suggestions failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/ai-analyze", async (req, res) => {
  try {
    const { sourceDatabase, targetDatabase, schemaText } = req.body;
    
    if (!schemaText) {
      return res.status(400).json({ error: "schemaText is required (DDL or schema description)" });
    }

    const prompt = `You are a database migration expert. Analyze the following database schema and provide migration guidance.

Source Database: ${sourceDatabase || 'Unknown'}
Target Database: ${targetDatabase || 'PostgreSQL'}

Schema/DDL:
${schemaText}

Provide a comprehensive analysis in JSON format with the following structure:
{
  "tables": [
    {
      "name": "table_name",
      "schema": "dbo",
      "columns": [{"name": "col", "dataType": "VARCHAR(100)", "nullable": true, "isPrimaryKey": false, "isAutoIncrement": false}],
      "rowCount": 0,
      "sizeBytes": 0
    }
  ],
  "indexes": [{"name": "idx_name", "tableName": "table", "columns": ["col"], "isUnique": false, "isClustered": false, "type": "NONCLUSTERED"}],
  "constraints": [{"name": "fk_name", "tableName": "table", "type": "FOREIGN KEY", "columns": ["col"], "referencedTable": "ref_table", "referencedColumns": ["id"]}],
  "partitions": [],
  "views": [],
  "procedures": [],
  "triggers": [],
  "migrationNotes": ["Note about potential issues"],
  "dataTypeIssues": ["List of data type conversion concerns"],
  "performanceRecommendations": ["Indexing and optimization suggestions"]
}

If you cannot parse the schema fully, provide your best effort with what you can extract.`;

    const result = await runLLM(prompt);
    res.json({ ok: true, analysis: result });
  } catch (e: any) {
    console.error("AI schema analysis failed:", e);
    res.status(500).json({ error: "AI schema analysis failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/test-connection", async (req, res) => {
  try {
    const { dbType, host, port, database, username, password } = req.body;
    
    if (!dbType || !host || !database) {
      return res.status(400).json({ error: "dbType, host, and database are required" });
    }

    let connected = false;
    let message = "";

    try {
      switch (dbType.toLowerCase()) {
        case 'postgresql': {
          const { Pool } = await import('pg');
          const pool = new Pool({
            host,
            port: port || 5432,
            database,
            user: username,
            password,
            connectionTimeoutMillis: 5000,
          });
          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          await pool.end();
          connected = true;
          message = "Successfully connected to PostgreSQL";
          break;
        }
        case 'mysql': {
          const mysql = await import('mysql2/promise');
          const conn = await mysql.createConnection({
            host,
            port: port || 3306,
            database,
            user: username,
            password,
            connectTimeout: 5000,
          });
          await conn.query('SELECT 1');
          await conn.end();
          connected = true;
          message = "Successfully connected to MySQL";
          break;
        }
        case 'mssql': {
          const sql = await import('mssql');
          const config = {
            server: host,
            port: port || 1433,
            database,
            user: username,
            password,
            options: { encrypt: false, trustServerCertificate: true },
            connectionTimeout: 5000,
          };
          const pool = await sql.default.connect(config);
          await pool.query`SELECT 1`;
          await pool.close();
          connected = true;
          message = "Successfully connected to SQL Server";
          break;
        }
        case 'oracle': {
          const oracledb = await import('oracledb');
          const conn = await oracledb.default.getConnection({
            user: username,
            password,
            connectString: `${host}:${port || 1521}/${database}`,
          });
          await conn.execute('SELECT 1 FROM DUAL');
          await conn.close();
          connected = true;
          message = "Successfully connected to Oracle";
          break;
        }
        default:
          return res.status(400).json({ error: `Unsupported database type: ${dbType}` });
      }
    } catch (connError: any) {
      message = connError.message || "Connection failed";
    }

    res.json({ ok: true, connected, message });
  } catch (e: any) {
    console.error("Connection test failed:", e);
    res.status(500).json({ error: "Connection test failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/discover-schema", async (req, res) => {
  try {
    const { dbType, host, port, database, username, password, schema } = req.body;
    
    if (!dbType || !host || !database) {
      return res.status(400).json({ error: "dbType, host, and database are required" });
    }

    const discoveredSchema: SourceSchema = {
      tables: [],
      indexes: [],
      constraints: [],
      partitions: [],
      views: [],
      procedures: [],
      triggers: [],
    };

    switch (dbType.toLowerCase()) {
      case 'postgresql': {
        const { Pool } = await import('pg');
        const pool = new Pool({
          host,
          port: port || 5432,
          database,
          user: username,
          password,
        });
        const client = await pool.connect();
        
        const schemaName = schema || 'public';
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_type = 'BASE TABLE'
        `, [schemaName]);
        
        for (const row of tablesResult.rows) {
          const tableName = row.table_name;
          const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default, 
                   character_maximum_length, numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `, [schemaName, tableName]);
          
          const pkResult = await client.query(`
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass AND i.indisprimary
          `, [`${schemaName}.${tableName}`]);
          const pkColumns = pkResult.rows.map((r: any) => r.attname);
          
          const countResult = await client.query(`SELECT COUNT(*) as cnt FROM "${schemaName}"."${tableName}"`);
          const rowCount = parseInt(countResult.rows[0].cnt) || 0;
          
          discoveredSchema.tables.push({
            name: tableName,
            schema: schemaName,
            columns: columnsResult.rows.map((col: any) => ({
              name: col.column_name,
              dataType: col.data_type.toUpperCase(),
              nullable: col.is_nullable === 'YES',
              defaultValue: col.column_default,
              isPrimaryKey: pkColumns.includes(col.column_name),
              isAutoIncrement: col.column_default?.includes('nextval') || false,
              length: col.character_maximum_length,
              precision: col.numeric_precision,
              scale: col.numeric_scale,
            })),
            rowCount,
            sizeBytes: 0,
          });
        }
        
        client.release();
        await pool.end();
        break;
      }
      case 'mysql': {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host,
          port: port || 3306,
          database,
          user: username,
          password,
        });
        
        const [tables] = await conn.query(`SHOW TABLES`);
        for (const row of tables as any[]) {
          const tableName = Object.values(row)[0] as string;
          const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
          const [countResult] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
          const rowCount = (countResult as any[])[0]?.cnt || 0;
          
          discoveredSchema.tables.push({
            name: tableName,
            schema: database,
            columns: (columns as any[]).map((col: any) => ({
              name: col.Field,
              dataType: col.Type.toUpperCase(),
              nullable: col.Null === 'YES',
              defaultValue: col.Default,
              isPrimaryKey: col.Key === 'PRI',
              isAutoIncrement: col.Extra?.includes('auto_increment') || false,
            })),
            rowCount,
            sizeBytes: 0,
          });
        }
        
        await conn.end();
        break;
      }
      case 'mssql': {
        const sql = await import('mssql');
        const config = {
          server: host,
          port: port || 1433,
          database,
          user: username,
          password,
          options: { encrypt: false, trustServerCertificate: true },
        };
        const pool = await sql.default.connect(config);
        const schemaName = schema || 'dbo';
        
        const tablesResult = await pool.query`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = ${schemaName} AND TABLE_TYPE = 'BASE TABLE'
        `;
        
        for (const row of tablesResult.recordset) {
          const tableName = row.TABLE_NAME;
          const columnsResult = await pool.query`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
                   CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ${schemaName} AND TABLE_NAME = ${tableName}
            ORDER BY ORDINAL_POSITION
          `;
          
          const pkResult = await pool.query`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ${schemaName} AND TABLE_NAME = ${tableName}
              AND CONSTRAINT_NAME LIKE 'PK%'
          `;
          const pkColumns = pkResult.recordset.map((r: any) => r.COLUMN_NAME);
          
          const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM [${schemaName}].[${tableName}]`);
          const rowCount = countResult.recordset[0]?.cnt || 0;
          
          discoveredSchema.tables.push({
            name: tableName,
            schema: schemaName,
            columns: columnsResult.recordset.map((col: any) => ({
              name: col.COLUMN_NAME,
              dataType: col.DATA_TYPE.toUpperCase(),
              nullable: col.IS_NULLABLE === 'YES',
              defaultValue: col.COLUMN_DEFAULT,
              isPrimaryKey: pkColumns.includes(col.COLUMN_NAME),
              isAutoIncrement: false,
              length: col.CHARACTER_MAXIMUM_LENGTH,
              precision: col.NUMERIC_PRECISION,
              scale: col.NUMERIC_SCALE,
            })),
            rowCount,
            sizeBytes: 0,
          });
        }
        
        await pool.close();
        break;
      }
      default:
        return res.status(400).json({ error: `Schema discovery not supported for: ${dbType}` });
    }

    res.json({ ok: true, schema: discoveredSchema });
  } catch (e: any) {
    console.error("Schema discovery failed:", e);
    res.status(500).json({ error: "Schema discovery failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/export-excel", async (req, res) => {
  try {
    const { plan, sourceDatabase, targetDatabase, schema } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: "Migration plan is required" });
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['Database Migration Plan'],
      [''],
      ['Source Database', sourceDatabase || 'Unknown'],
      ['Target Database', targetDatabase || 'Unknown'],
      ['Total Duration (Days)', plan.totalDays || 0],
      ['Total Duration (Hours)', plan.totalHours || 0],
      [''],
      ['Phases Summary'],
    ];
    
    if (plan.phases) {
      for (const phase of plan.phases) {
        summaryData.push([phase.name, `${phase.durationDays} days`]);
      }
    }
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    if (plan.phases) {
      const tasksData = [['Phase', 'Task', 'Type', 'Description', 'Estimated Hours', 'Tables']];
      for (const phase of plan.phases) {
        for (const task of phase.tasks || []) {
          tasksData.push([
            phase.name,
            task.name,
            task.type,
            task.description,
            task.estimatedHours,
            task.tables?.join(', ') || '',
          ]);
        }
      }
      const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
    }

    if (plan.dataTypeConversions) {
      const dtData = [['Source Type', 'Target Type', 'Notes', 'Potential Issues']];
      for (const conv of plan.dataTypeConversions) {
        dtData.push([conv.sourceType, conv.targetType, conv.notes, conv.potentialIssues || '']);
      }
      const dtSheet = XLSX.utils.aoa_to_sheet(dtData);
      XLSX.utils.book_append_sheet(workbook, dtSheet, 'Data Types');
    }

    if (plan.risks) {
      const risksData = [['Severity', 'Category', 'Description', 'Mitigation']];
      for (const risk of plan.risks) {
        risksData.push([risk.severity, risk.category, risk.description, risk.mitigation]);
      }
      const risksSheet = XLSX.utils.aoa_to_sheet(risksData);
      XLSX.utils.book_append_sheet(workbook, risksSheet, 'Risks');
    }

    if (schema?.tables) {
      const tablesData = [['Table', 'Schema', 'Row Count', 'Size (MB)', 'Columns']];
      for (const table of schema.tables) {
        tablesData.push([
          table.name,
          table.schema || '',
          table.rowCount || 0,
          ((table.sizeBytes || 0) / 1024 / 1024).toFixed(2),
          table.columns?.length || 0,
        ]);
      }
      const tablesSheet = XLSX.utils.aoa_to_sheet(tablesData);
      XLSX.utils.book_append_sheet(workbook, tablesSheet, 'Tables');
    }

    if (plan.dataMigrationTasks) {
      const dmData = [['Table', 'Estimated Rows', 'Size Estimate', 'Priority', 'ETL Notes']];
      for (const task of plan.dataMigrationTasks) {
        dmData.push([
          task.tableName,
          task.estimatedRows || 0,
          task.sizeEstimate || '',
          task.priority || 'Medium',
          task.etlNotes || '',
        ]);
      }
      const dmSheet = XLSX.utils.aoa_to_sheet(dmData);
      XLSX.utils.book_append_sheet(workbook, dmSheet, 'Data Migration');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=migration-plan.xlsx');
    res.send(buffer);
  } catch (e: any) {
    console.error("Excel export failed:", e);
    res.status(500).json({ error: "Excel export failed", details: e?.message || String(e) });
  }
});

app.post("/api/migration/generate-inserts", async (req, res) => {
  try {
    const { sourceDatabase, targetDatabase, schema, connection } = req.body;
    
    if (!schema || !connection) {
      return res.status(400).json({ error: "schema and connection are required" });
    }

    const { host, port, database, username, password } = connection;
    const tables = schema.tables || [];
    
    if (tables.length === 0) {
      return res.status(400).json({ error: "No tables in schema" });
    }

    let inserts: string[] = [];
    const MAX_ROWS_PER_TABLE = 1000;

    const quoteIdentifier = (name: string, targetDb: string): string => {
      switch (targetDb) {
        case 'mysql':
          return `\`${name}\``;
        case 'mssql':
          return `[${name}]`;
        case 'postgresql':
        case 'oracle':
        default:
          return `"${name}"`;
      }
    };

    const escapeValue = (val: any, targetDb: string): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') {
        if (targetDb === 'postgresql') return val ? 'TRUE' : 'FALSE';
        if (targetDb === 'mysql') return val ? '1' : '0';
        return val ? '1' : '0';
      }
      if (val instanceof Date) {
        const iso = val.toISOString().replace('T', ' ').replace('Z', '');
        return `'${iso}'`;
      }
      const escaped = String(val).replace(/'/g, "''");
      return `'${escaped}'`;
    };

    switch (sourceDatabase) {
      case 'postgresql': {
        const pg = await import('pg');
        const pool = new pg.default.Pool({
          host,
          port: port || 5432,
          database,
          user: username,
          password,
        });
        const client = await pool.connect();

        for (const table of tables) {
          const schemaName = table.schema || 'public';
          const tableName = table.name;
          const columns = table.columns.map((c: any) => c.name);
          
          const dataResult = await client.query(
            `SELECT * FROM "${schemaName}"."${tableName}" LIMIT ${MAX_ROWS_PER_TABLE}`
          );
          
          if (dataResult.rows.length > 0) {
            inserts.push(`-- INSERT statements for ${tableName}`);
            const quotedTable = quoteIdentifier(tableName, targetDatabase);
            const quotedCols = columns.map((c: string) => quoteIdentifier(c, targetDatabase)).join(', ');
            for (const row of dataResult.rows) {
              const values = columns.map((col: string) => escapeValue(row[col], targetDatabase));
              inserts.push(`INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${values.join(', ')});`);
            }
            inserts.push('');
          }
        }

        client.release();
        await pool.end();
        break;
      }
      case 'mysql': {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host,
          port: port || 3306,
          database,
          user: username,
          password,
        });

        for (const table of tables) {
          const tableName = table.name;
          const columns = table.columns.map((c: any) => c.name);
          
          const [rows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT ${MAX_ROWS_PER_TABLE}`);
          
          if ((rows as any[]).length > 0) {
            inserts.push(`-- INSERT statements for ${tableName}`);
            const quotedTable = quoteIdentifier(tableName, targetDatabase);
            const quotedCols = columns.map((c: string) => quoteIdentifier(c, targetDatabase)).join(', ');
            for (const row of rows as any[]) {
              const values = columns.map((col: string) => escapeValue(row[col], targetDatabase));
              inserts.push(`INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${values.join(', ')});`);
            }
            inserts.push('');
          }
        }

        await conn.end();
        break;
      }
      case 'mssql': {
        const sql = await import('mssql');
        const config = {
          server: host,
          port: port || 1433,
          database,
          user: username,
          password,
          options: { encrypt: false, trustServerCertificate: true },
        };
        const pool = await sql.default.connect(config);

        for (const table of tables) {
          const schemaName = table.schema || 'dbo';
          const tableName = table.name;
          const columns = table.columns.map((c: any) => c.name);
          
          const result = await pool.query(`SELECT TOP ${MAX_ROWS_PER_TABLE} * FROM [${schemaName}].[${tableName}]`);
          
          if (result.recordset.length > 0) {
            inserts.push(`-- INSERT statements for ${tableName}`);
            const quotedTable = quoteIdentifier(tableName, targetDatabase);
            const quotedCols = columns.map((c: string) => quoteIdentifier(c, targetDatabase)).join(', ');
            for (const row of result.recordset) {
              const values = columns.map((col: string) => escapeValue(row[col], targetDatabase));
              inserts.push(`INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${values.join(', ')});`);
            }
            inserts.push('');
          }
        }

        await pool.close();
        break;
      }
      default:
        return res.status(400).json({ error: `INSERT generation not supported for: ${sourceDatabase}` });
    }

    const header = `-- INSERT Statements for Migration\n-- Source: ${sourceDatabase}\n-- Target: ${targetDatabase}\n-- Generated: ${new Date().toISOString()}\n-- Note: Limited to ${MAX_ROWS_PER_TABLE} rows per table\n\n`;
    
    res.json({ ok: true, inserts: header + inserts.join('\n') });
  } catch (e: any) {
    console.error("INSERT generation failed:", e);
    res.status(500).json({ error: "INSERT generation failed", details: e?.message || String(e) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Generator on :${PORT}`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER || "mock"}`);
  console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? "configured" : "not set (using mock)"}`);
});
