import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { runLLM, runLLMForType, runGenerateCode, runReviewCode, runFixCode, runExplainCode } from "./llm/index.js";
import { groqGenerateMobileApp, groqGenerateBackendApi } from "./llm/providers/groq-mobile.js";
import {
  groqGenerateInfrastructure,
  groqGenerateCICD,
  groqGenerateMigrations,
  groqGenerateAuth,
  groqGenerateLoadTests,
  groqGenerateAPIDocs,
  groqGenerateSecurity,
  groqGenerateCostOptimization,
  groqGenerateDocumentation,
  groqRecommendDomainModules,
  groqGenerateSingleModule,
  groqNLPAssistant,
  groqConversationalAssistant,
  groqProjectAgent,
  type ProjectSession,
  type Project as ProjectType,
} from "./llm/providers/groq-devops.js";

// In-memory session storage (would use DB in production)
const projectSessions = new Map<string, ProjectSession>();
import { db } from "./db/index.js";
import { workspaces, chatSessions, projects } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
import { provisionProjectDatabase, getProjectTables, getTableData, dropProjectTables, insertSampleData } from "./db/project-database.js";
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
  generateProjectDocumentation,
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
    const { type, domain, database, tier, appServers, dbReplicas, cacheNodes, region, projectName, tables, modules, cloudProvider } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered infrastructure generation");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-platform`,
        cloudProvider: cloudProvider || "aws",
        region: region || "us-east-1",
        environment: "production" as const,
        services: ["web", "api"],
        database: database || "postgresql",
        cache: (cacheNodes || 0) > 0,
        scaling: appServers ? { min: 1, max: appServers } : undefined,
        tables: tables || [],
        modules: modules || [],
      };
      const aiResult = await groqGenerateInfrastructure(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    const { type, domain, projectName, language, registry, cloudProvider, tables, database } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered CI/CD generation");
      const platformMap: Record<string, 'github' | 'gitlab' | 'jenkins'> = {
        'github-actions': 'github',
        'gitlab-ci': 'gitlab',
        'jenkins': 'jenkins',
      };
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-platform`,
        platform: platformMap[type] || "github" as const,
        language: (language === "typescript" ? "nodejs" : language || "nodejs") as 'nodejs' | 'python' | 'go' | 'java',
        database: database || "postgresql",
        deploymentTarget: "kubernetes" as const,
        environments: ["development", "staging", "production"],
        features: {
          unitTests: true,
          integrationTests: true,
          e2eTests: false,
          securityScan: true,
          codeQuality: true,
          containerBuild: true,
          autoRelease: false,
        },
        tables: tables || [],
      };
      const aiResult = await groqGenerateCICD(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered API docs generation");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-api`,
        version: "1.0.0",
        baseUrl: baseUrl || "https://api.example.com",
        description: `${domain} API - Generated by IPL`,
        tables: tables,
        authentication: "jwt" as const,
      };
      const aiResult = await groqGenerateAPIDocs(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
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
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered migration generation");
      const ormMap: Record<string, 'drizzle' | 'prisma' | 'typeorm' | 'none'> = {
        'drizzle': 'drizzle',
        'sql': 'none',
      };
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-db`,
        database: (database || "postgresql") as 'postgresql' | 'mysql' | 'mssql' | 'oracle',
        orm: ormMap[type] || "drizzle",
        tables: tables,
        seedData: true,
        auditColumns: true,
        softDelete: false,
      };
      const aiResult = await groqGenerateMigrations(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
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
    const { type, domain, projectName, providers, mfa, tables } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered auth generation");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-auth`,
        framework: "express" as const,
        authType: (type === "oauth" ? "oauth" : type === "jwt" ? "jwt" : "both") as 'jwt' | 'oauth' | 'both',
        oauthProviders: providers || ["google", "github"],
        mfa: mfa || false,
        rbac: true,
        roles: ["user", "admin"],
        sessionManagement: "stateless" as const,
        tables: tables || [],
      };
      const aiResult = await groqGenerateAuth(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    const { type, domain, projectName, baseUrl, targetRPS, duration, endpoints, tables } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered load test generation");
      const toolMap: Record<string, 'k6' | 'jmeter' | 'artillery' | 'locust'> = {
        'k6': 'k6',
        'jmeter': 'jmeter',
      };
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-load-tests`,
        tool: toolMap[type] || "k6",
        baseUrl: baseUrl || "http://localhost:3000",
        endpoints: endpoints || [
          { method: "GET" as const, path: "/api/health" },
          { method: "GET" as const, path: "/api/users" },
        ],
        scenarios: {
          smoke: { vus: 5, duration: "1m" },
          load: { vus: targetRPS || 50, duration: duration || "5m" },
          stress: { vus: (targetRPS || 50) * 2, duration: "10m" },
        },
        thresholds: {
          p95ResponseTime: 500,
          p99ResponseTime: 1000,
          errorRate: 1,
        },
        tables: tables || [],
      };
      const aiResult = await groqGenerateLoadTests(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    const { domain, projectName, compliance, deploymentType, cloudProvider, database, authentication, tables } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered security analysis");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-security`,
        compliance: compliance || [],
        deploymentType: (deploymentType || "cloud") as 'cloud' | 'on-premises' | 'hybrid',
        cloudProvider: cloudProvider || "aws",
        database: database || "postgresql",
        authentication: authentication || "jwt",
        tables: tables || [],
      };
      const aiResult = await groqGenerateSecurity(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    const { domain, tier, cloudProvider, currentCost, appServers, dbReplicas, cacheNodes, storageGB, monthlyEgressGB, projectName, tables } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered cost optimization");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-optimization`,
        cloudProvider: (cloudProvider || "aws") as 'aws' | 'azure' | 'gcp',
        tier: tier || "Medium",
        currentCost: currentCost || 5000,
        appServers: appServers || 2,
        dbReplicas: dbReplicas || 1,
        cacheNodes: cacheNodes || 1,
        storageGB: storageGB || 1000,
        monthlyEgressGB: monthlyEgressGB || 500,
        tables: tables || [],
      };
      const aiResult = await groqGenerateCostOptimization(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
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
    
    const provider = process.env.LLM_PROVIDER || "mock";
    let result;
    
    if (provider === "groq" && process.env.GROQ_API_KEY) {
      console.log("Generating mobile app with Groq AI...");
      result = await groqGenerateMobileApp(config as any);
    } else {
      result = generateMobileApp(config as any);
    }
    
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
    
    const provider = process.env.LLM_PROVIDER || "mock";
    let result;
    
    if (provider === "groq" && process.env.GROQ_API_KEY) {
      console.log("Generating backend API with Groq AI...");
      result = await groqGenerateBackendApi(config);
    } else {
      result = generateBackendApi(config);
    }
    
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Backend API generation failed:", e);
    res.status(500).json({ error: "Backend API generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/generate-documentation", async (req, res) => {
  try {
    const { domain, projectName, requirements, infrastructure, techStack, tables, security, deploymentType, cloudProvider, compliance, modules, screens } = req.body;
    
    if (process.env.GROQ_API_KEY) {
      console.log("Using AI-powered documentation generation");
      const aiConfig = {
        domain: domain || "custom",
        projectName: projectName || `${domain}-project`,
        modules: modules || [],
        screens: screens || [],
        tables: tables || [],
        techStack: techStack || {
          frontend: "React",
          backend: "Node.js/Express",
          database: "PostgreSQL",
          cloud: cloudProvider || "aws",
        },
      };
      const aiResult = await groqGenerateDocumentation(aiConfig);
      return res.json({ ok: true, aiGenerated: true, ...aiResult });
    }
    
    const ctx = {
      domain: domain || "custom",
      projectName,
      requirements,
      infrastructure,
      techStack,
      tables: tables || [],
      security: security || [],
      deploymentType: deploymentType || "cloud",
      cloudProvider: cloudProvider || "aws",
      compliance: compliance || [],
    };
    
    const result = generateProjectDocumentation(ctx);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Documentation generation failed:", e);
    res.status(500).json({ error: "Documentation generation failed", details: e?.message || String(e) });
  }
});

// AI-powered NLP Assistant - Natural Language Interface
app.post("/api/assistant", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI assistant requires GROQ_API_KEY" });
    }
    
    console.log(`Processing NLP request: "${prompt.substring(0, 50)}..."`);
    const result = await groqNLPAssistant({ prompt, context });
    
    res.json({ ok: true, aiGenerated: true, ...result });
  } catch (e: any) {
    console.error("AI assistant failed:", e);
    res.status(500).json({ error: "AI assistant failed", details: e?.message || String(e) });
  }
});

// Conversational AI with Session Context - Incremental Development (Database Persisted)
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, domain, database, cloudProvider } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI chat requires GROQ_API_KEY" });
    }
    
    // Get or create session from database
    const sid = sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    let dbSession = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sid)).limit(1);
    
    let session: ProjectSession;
    
    if (dbSession.length === 0) {
      // Create new session in database
      const [newSession] = await db.insert(chatSessions).values({
        sessionId: sid,
        domain: domain || '',
        database: database || 'postgresql',
        cloudProvider: cloudProvider || 'aws',
        modules: [],
        conversationHistory: [],
      }).returning();
      
      session = {
        sessionId: sid,
        domain: newSession.domain || '',
        database: newSession.database || 'postgresql',
        cloudProvider: newSession.cloudProvider || 'aws',
        modules: [],
        createdAt: newSession.createdAt,
        updatedAt: newSession.updatedAt,
      };
    } else {
      // Load existing session
      const existingSession = dbSession[0];
      session = {
        sessionId: existingSession.sessionId,
        domain: existingSession.domain || '',
        database: existingSession.database || 'postgresql',
        cloudProvider: existingSession.cloudProvider || 'aws',
        modules: (existingSession.modules as any) || [],
        createdAt: existingSession.createdAt,
        updatedAt: existingSession.updatedAt,
      };
    }
    
    // Update session with any new context
    if (domain) session.domain = domain;
    if (database) session.database = database;
    if (cloudProvider) session.cloudProvider = cloudProvider;
    
    console.log(`Chat session ${sid}: "${message.substring(0, 50)}..."`);
    const result = await groqConversationalAssistant({
      sessionId: sid,
      message,
      projectContext: session,
    });
    
    // Update session with any context changes from AI
    if (result.updatedContext?.modules) {
      session.modules = result.updatedContext.modules as any;
    }
    if (result.updatedContext?.domain) {
      session.domain = result.updatedContext.domain;
    }
    
    // Save to database
    await db.update(chatSessions)
      .set({
        domain: session.domain,
        database: session.database,
        cloudProvider: session.cloudProvider,
        modules: session.modules as any,
        conversationHistory: [
          ...((dbSession[0]?.conversationHistory as any) || []),
          { role: 'user', message, timestamp: new Date().toISOString() },
          { role: 'assistant', message: result.message, timestamp: new Date().toISOString() },
        ],
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.sessionId, sid));
    
    res.json({ 
      ok: true, 
      aiGenerated: true, 
      sessionId: sid,
      projectState: {
        domain: session.domain,
        database: session.database,
        completedModules: session.modules.filter((m: any) => m.status === 'completed').map((m: any) => m.name),
        existingTables: session.modules.flatMap((m: any) => m.tables?.map((t: any) => t.name) || []),
      },
      ...result 
    });
  } catch (e: any) {
    console.error("AI chat failed:", e);
    res.status(500).json({ error: "AI chat failed", details: e?.message || String(e) });
  }
});

// Get session state from database
app.get("/api/chat/:sessionId", async (req, res) => {
  try {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, req.params.sessionId)).limit(1);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ ok: true, session });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get session", details: e?.message || String(e) });
  }
});

// List all sessions for a user (could filter by user in future)
app.get("/api/chat-sessions", async (req, res) => {
  try {
    const sessions = await db.select({
      sessionId: chatSessions.sessionId,
      domain: chatSessions.domain,
      modules: chatSessions.modules,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    }).from(chatSessions).orderBy(desc(chatSessions.updatedAt)).limit(50);
    res.json({ ok: true, sessions });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to list sessions", details: e?.message || String(e) });
  }
});

// ===================== PROJECT-BASED AI AGENT =====================

// Create a new project
app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, domain, database, cloudProvider } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }
    
    const projectId = `project-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const [newProject] = await db.insert(projects).values({
      projectId,
      name,
      description: description || '',
      domain: domain || '',
      database: database || 'postgresql',
      cloudProvider: cloudProvider || 'aws',
      status: 'planning',
      modules: [],
      generatedFiles: [],
      conversationHistory: [],
    }).returning();
    
    res.json({ ok: true, project: newProject });
  } catch (e: any) {
    console.error("Create project failed:", e);
    res.status(500).json({ error: "Failed to create project", details: e?.message || String(e) });
  }
});

// List all projects
app.get("/api/projects", async (req, res) => {
  try {
    const allProjects = await db.select({
      projectId: projects.projectId,
      name: projects.name,
      description: projects.description,
      domain: projects.domain,
      status: projects.status,
      modules: projects.modules,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    }).from(projects).orderBy(desc(projects.updatedAt)).limit(50);
    res.json({ ok: true, projects: allProjects });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to list projects", details: e?.message || String(e) });
  }
});

// Get a specific project
app.get("/api/projects/:projectId", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ ok: true, project });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get project", details: e?.message || String(e) });
  }
});

// AI Agent: Work on a project with natural language
app.post("/api/projects/:projectId/agent", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI agent requires GROQ_API_KEY" });
    }
    
    // Get project from database
    const [dbProject] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!dbProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Convert to ProjectType for the agent
    const projectForAgent: ProjectType = {
      id: dbProject.projectId,
      name: dbProject.name,
      description: dbProject.description || '',
      domain: dbProject.domain || '',
      database: dbProject.database || 'postgresql',
      cloudProvider: dbProject.cloudProvider || 'aws',
      status: (dbProject.status as any) || 'planning',
      modules: (dbProject.modules as any) || [],
      generatedFiles: (dbProject.generatedFiles as any) || [],
      conversationHistory: (dbProject.conversationHistory as any) || [],
    };
    
    console.log(`Project Agent [${dbProject.name}]: "${message.substring(0, 50)}..."`);
    
    // Convert conversation history for the agent (last 10 messages for context)
    const conversationForAgent = projectForAgent.conversationHistory
      .slice(-10)
      .map(h => ({ role: h.role, content: h.message }));
    
    const result = await groqProjectAgent({
      project: projectForAgent,
      userMessage: message,
      conversationHistory: conversationForAgent,
    });
    
    // Update project with changes
    const updatedModules = result.updatedProject?.modules || projectForAgent.modules;
    const updatedFiles = result.generatedCode?.files 
      ? [...projectForAgent.generatedFiles, ...result.generatedCode.files.map(f => ({ ...f, type: 'generated' }))]
      : projectForAgent.generatedFiles;
    
    await db.update(projects)
      .set({
        domain: result.updatedProject?.domain || projectForAgent.domain,
        status: result.updatedProject?.status || projectForAgent.status,
        modules: updatedModules as any,
        generatedFiles: updatedFiles as any,
        conversationHistory: [
          ...projectForAgent.conversationHistory,
          { role: 'user', message, timestamp: new Date().toISOString() },
          { role: 'assistant', message: result.message, timestamp: new Date().toISOString() },
        ],
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    // Get updated project
    const [updatedProject] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    
    // Check if we should auto-run the pipeline (when a module was built)
    let automationResult = null;
    const shouldAutomate = result.action === 'module_built' || 
                           result.action === 'module_updated' ||
                           (updatedModules.length > 0 && updatedModules.some((m: any) => m.status === 'completed'));
    
    if (shouldAutomate) {
      console.log(`[Agent] Auto-running pipeline for project ${req.params.projectId}`);
      // Run automation in background - don't block the response
      runAutomationPipeline(req.params.projectId).then(pipelineResult => {
        console.log(`[Agent] Pipeline completed:`, pipelineResult);
      }).catch(err => {
        console.error(`[Agent] Pipeline failed:`, err);
      });
      automationResult = { status: 'started', message: 'Automatically building and running your application...' };
    }
    
    res.json({
      ok: true,
      aiGenerated: true,
      action: result.action,
      message: result.message,
      generatedCode: result.generatedCode,
      nextSteps: result.nextSteps,
      suggestedModules: result.suggestedModules,
      questions: result.questions,
      suggestions: result.suggestions,
      automation: automationResult,
      project: {
        projectId: updatedProject.projectId,
        name: updatedProject.name,
        domain: updatedProject.domain,
        status: updatedProject.status,
        modulesCount: (updatedProject.modules as any)?.length || 0,
        completedModules: ((updatedProject.modules as any) || []).filter((m: any) => m.status === 'completed').map((m: any) => m.name),
        filesCount: (updatedProject.generatedFiles as any)?.length || 0,
      },
    });
  } catch (e: any) {
    console.error("Project agent failed:", e);
    res.status(500).json({ error: "AI agent failed", details: e?.message || String(e) });
  }
});

// Get generated files for a project
app.get("/api/projects/:projectId/files", async (req, res) => {
  try {
    const [project] = await db.select({
      generatedFiles: projects.generatedFiles,
    }).from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json({ ok: true, files: project.generatedFiles });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get files", details: e?.message || String(e) });
  }
});

// Delete a project
app.delete("/api/projects/:projectId", async (req, res) => {
  try {
    await db.delete(projects).where(eq(projects.projectId, req.params.projectId));
    res.json({ ok: true, message: "Project deleted" });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete project", details: e?.message || String(e) });
  }
});

// ===================== STREAMING AGENT ENDPOINT =====================
// This provides Claude-like capabilities with real-time updates

import { AgentOrchestrator, getSession } from "./llm/agent-orchestrator.js";

app.post("/api/projects/:projectId/agent-stream", async (req, res) => {
  const { message, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  // Set up SSE headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const orchestrator = new AgentOrchestrator(req.params.projectId, sessionId);

  // Stream events to client
  orchestrator.on("event", (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  try {
    await orchestrator.run(message);
    res.write(`data: ${JSON.stringify({ type: "done", timestamp: Date.now() })}\n\n`);
    res.end();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", data: { error: e?.message || String(e) }, timestamp: Date.now() })}\n\n`);
    res.end();
  }
});

// Get agent session state
app.get("/api/projects/:projectId/agent-session/:sessionId", async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ ok: true, session });
});

// Materialize project code - generates actual runnable files
app.post("/api/projects/:projectId/materialize", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const modules = (project.modules as any) || [];
    if (modules.length === 0) {
      return res.status(400).json({ error: "No modules to materialize. Build some modules first." });
    }
    
    const { materializeProject } = await import("./generators/code-materializer.js");
    
    const result = await materializeProject({
      projectId: project.projectId,
      projectName: project.name || "IPL Project",
      domain: project.domain || "custom",
      database: project.database || "postgresql",
      modules: modules,
    });
    
    // Store generated files in database
    const generatedFiles = result.files.map(f => ({
      path: f.path,
      content: f.content,
      type: f.type,
    }));
    
    await db.update(projects)
      .set({
        generatedFiles: generatedFiles as any,
        status: "materialized",
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({
      ok: true,
      projectDir: result.projectDir,
      filesCount: result.files.length,
      files: result.files.map(f => ({ path: f.path, type: f.type })),
      commands: result.commands,
    });
  } catch (e: any) {
    console.error("Materialize project failed:", e);
    res.status(500).json({ error: "Failed to materialize project", details: e?.message || String(e) });
  }
});

// Get materialized project files
app.get("/api/projects/:projectId/materialized-files", async (req, res) => {
  try {
    const { getProjectFiles } = await import("./generators/code-materializer.js");
    const files = await getProjectFiles(req.params.projectId);
    res.json({ ok: true, files });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get materialized files", details: e?.message || String(e) });
  }
});

// ============================================================
// PROJECT RUNNER - Start/Stop Generated Applications
// ============================================================
import { spawn, ChildProcess } from "child_process";

interface RunningProject {
  process: ChildProcess;
  port: number;
  logs: string[];
  status: "starting" | "running" | "stopped" | "error";
  startedAt: Date;
}

const runningProjects = new Map<string, RunningProject>();
const automationInProgress = new Set<string>();
const PROJECT_PORT_START = 3100;

function getNextAvailablePort(): number {
  const usedPorts = new Set([...runningProjects.values()].map(p => p.port));
  for (let port = PROJECT_PORT_START; port < PROJECT_PORT_START + 100; port++) {
    if (!usedPorts.has(port)) return port;
  }
  return PROJECT_PORT_START + 100;
}

// Automation pipeline: materialize -> provision -> run
async function runAutomationPipeline(projectId: string): Promise<{
  success: boolean;
  stage: string;
  error?: string;
  port?: number;
}> {
  // Prevent concurrent automation runs
  if (automationInProgress.has(projectId)) {
    console.log(`[Automation] Already in progress for ${projectId}, skipping`);
    return { success: false, stage: "skipped", error: "Automation already in progress" };
  }
  
  // Skip if app is already running
  const existing = runningProjects.get(projectId);
  if (existing && (existing.status === "running" || existing.status === "starting")) {
    console.log(`[Automation] App already running for ${projectId}, skipping`);
    return { success: true, stage: "already_running", port: existing.port };
  }
  
  automationInProgress.add(projectId);
  const fs = await import("fs/promises");
  const PROJECTS_DIR = "/tmp/ipl-projects";
  
  try {
    // Stage 1: Materialize code
    console.log(`[Automation] Stage 1: Materializing project ${projectId}`);
    const [project] = await db.select().from(projects).where(eq(projects.projectId, projectId)).limit(1);
    if (!project) {
      return { success: false, stage: "materialize", error: "Project not found" };
    }
    
    const modules = (project.modules as any) || [];
    if (modules.length === 0) {
      return { success: false, stage: "materialize", error: "No modules to materialize" };
    }
    
    const { materializeProject } = await import("./generators/code-materializer.js");
    const materializeResult = await materializeProject({
      projectId: project.projectId,
      projectName: project.name || "IPL Project",
      domain: project.domain || "custom",
      database: project.database || "postgresql",
      modules: modules,
    });
    
    // Update generated files in DB - store metadata only (path and type)
    const existingFiles = (project.generatedFiles as any[]) || [];
    const newFilesMeta = materializeResult.files.map(f => ({
      path: f.path,
      type: f.type,
    }));
    
    // Merge - avoid duplicates by path
    const mergedFiles = [...existingFiles];
    for (const newFile of newFilesMeta) {
      const existingIndex = mergedFiles.findIndex((f: any) => f.path === newFile.path);
      if (existingIndex >= 0) {
        mergedFiles[existingIndex] = newFile;
      } else {
        mergedFiles.push(newFile);
      }
    }
    
    await db.update(projects)
      .set({
        generatedFiles: mergedFiles as any,
        status: "materialized",
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, projectId));
    
    // Stage 2: Provision database
    console.log(`[Automation] Stage 2: Provisioning database for ${projectId}`);
    try {
      const provisionResult = await provisionProjectDatabase(projectId, modules);
      console.log(`[Automation] Database provisioned: ${provisionResult.tablesCreated} tables`);
    } catch (dbError: any) {
      console.log(`[Automation] Database provision skipped or failed: ${dbError?.message}`);
    }
    
    // Stage 3: Run the application
    console.log(`[Automation] Stage 3: Starting application for ${projectId}`);
    const projectDir = `${PROJECTS_DIR}/${projectId}`;
    
    try {
      await fs.access(projectDir);
    } catch {
      return { success: false, stage: "run", error: "Project directory not found" };
    }
    
    const port = getNextAvailablePort();
    const logs: string[] = [];
    const projectState: RunningProject = {
      process: null as any,
      port,
      logs,
      status: "starting",
      startedAt: new Date()
    };
    
    runningProjects.set(projectId, projectState);
    logs.push(`[${new Date().toISOString()}] [Auto] Starting project on port ${port}...`);
    logs.push(`[${new Date().toISOString()}] [Auto] Installing dependencies...`);
    
    // Run npm install
    await new Promise<void>((resolve, reject) => {
      const npmInstall = spawn("npm", ["install"], { 
        cwd: projectDir,
        env: { ...process.env, PORT: String(port) }
      });
      
      projectState.process = npmInstall;
      
      npmInstall.stdout.on("data", (data) => {
        logs.push(data.toString().trim());
        if (logs.length > 500) logs.shift();
      });
      
      npmInstall.stderr.on("data", (data) => {
        logs.push(data.toString().trim());
        if (logs.length > 500) logs.shift();
      });
      
      npmInstall.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
      
      npmInstall.on("error", reject);
    });
    
    logs.push(`[${new Date().toISOString()}] [Auto] Dependencies installed. Starting server...`);
    
    // Start the server
    const serverProcess = spawn("npm", ["start"], {
      cwd: projectDir,
      env: { ...process.env, PORT: String(port), DATABASE_URL: process.env.DATABASE_URL }
    });
    
    projectState.process = serverProcess;
    projectState.status = "running";
    
    serverProcess.stdout.on("data", (data) => {
      logs.push(data.toString().trim());
      if (logs.length > 500) logs.shift();
    });
    
    serverProcess.stderr.on("data", (data) => {
      logs.push(data.toString().trim());
      if (logs.length > 500) logs.shift();
    });
    
    serverProcess.on("close", (exitCode) => {
      logs.push(`[${new Date().toISOString()}] Server exited with code ${exitCode}`);
      projectState.status = "stopped";
    });
    
    serverProcess.on("error", (err) => {
      logs.push(`[${new Date().toISOString()}] Server error: ${err.message}`);
      projectState.status = "error";
    });
    
    console.log(`[Automation] Complete! App running on port ${port}`);
    return { success: true, stage: "complete", port };
    
  } catch (error: any) {
    console.error(`[Automation] Failed:`, error);
    return { success: false, stage: "unknown", error: error?.message || String(error) };
  } finally {
    automationInProgress.delete(projectId);
  }
}

app.post("/api/projects/:projectId/run", async (req, res) => {
  const { projectId } = req.params;
  const PROJECTS_DIR = "/tmp/ipl-projects";
  const projectDir = `${PROJECTS_DIR}/${projectId}`;
  
  try {
    const fs = await import("fs/promises");
    await fs.access(projectDir);
    
    if (runningProjects.has(projectId)) {
      const existing = runningProjects.get(projectId)!;
      if (existing.status === "running" || existing.status === "starting") {
        return res.json({ 
          ok: true, 
          status: existing.status, 
          port: existing.port,
          message: "Project already running",
          logs: existing.logs.slice(-50)
        });
      }
    }
    
    const port = getNextAvailablePort();
    const logs: string[] = [];
    const projectState: RunningProject = {
      process: null as any,
      port,
      logs,
      status: "starting",
      startedAt: new Date()
    };
    
    runningProjects.set(projectId, projectState);
    
    logs.push(`[${new Date().toISOString()}] Starting project on port ${port}...`);
    logs.push(`[${new Date().toISOString()}] Installing dependencies...`);
    
    const npmInstall = spawn("npm", ["install"], { 
      cwd: projectDir,
      env: { ...process.env, PORT: String(port) }
    });
    
    projectState.process = npmInstall;
    
    npmInstall.stdout.on("data", (data) => {
      logs.push(data.toString().trim());
      if (logs.length > 500) logs.shift();
    });
    
    npmInstall.stderr.on("data", (data) => {
      logs.push(data.toString().trim());
      if (logs.length > 500) logs.shift();
    });
    
    npmInstall.on("error", (err) => {
      logs.push(`[${new Date().toISOString()}] Install error: ${err.message}`);
      projectState.status = "error";
    });
    
    npmInstall.on("close", (code) => {
      if (code === 0) {
        logs.push(`[${new Date().toISOString()}] Dependencies installed. Starting server...`);
        
        const serverProcess = spawn("npm", ["start"], {
          cwd: projectDir,
          env: { ...process.env, PORT: String(port), DATABASE_URL: process.env.DATABASE_URL }
        });
        
        projectState.process = serverProcess;
        projectState.status = "running";
        
        serverProcess.stdout.on("data", (data) => {
          logs.push(data.toString().trim());
          if (logs.length > 500) logs.shift();
        });
        
        serverProcess.stderr.on("data", (data) => {
          logs.push(data.toString().trim());
          if (logs.length > 500) logs.shift();
        });
        
        serverProcess.on("close", (exitCode) => {
          logs.push(`[${new Date().toISOString()}] Server exited with code ${exitCode}`);
          projectState.status = "stopped";
        });
        
        serverProcess.on("error", (err) => {
          logs.push(`[${new Date().toISOString()}] Server error: ${err.message}`);
          projectState.status = "error";
        });
      } else {
        logs.push(`[${new Date().toISOString()}] npm install failed with code ${code}`);
        projectState.status = "error";
      }
    });
    
    res.json({ 
      ok: true, 
      status: "starting", 
      port,
      message: "Project starting...",
      logs: logs.slice(-20)
    });
  } catch (e: any) {
    res.status(400).json({ 
      error: "Project not materialized yet. Generate code first.",
      details: e?.message
    });
  }
});

app.post("/api/projects/:projectId/stop", async (req, res) => {
  const { projectId } = req.params;
  
  const running = runningProjects.get(projectId);
  if (!running) {
    return res.json({ ok: true, message: "Project not running" });
  }
  
  try {
    if (running.process) {
      running.process.kill("SIGTERM");
    }
    running.logs.push(`[${new Date().toISOString()}] Server stopped by user`);
    running.status = "stopped";
    runningProjects.delete(projectId);
    
    res.json({ ok: true, message: "Project stopped" });
  } catch (e: any) {
    runningProjects.delete(projectId);
    res.status(500).json({ error: "Failed to stop project", details: e?.message });
  }
});

app.get("/api/projects/:projectId/status", async (req, res) => {
  const { projectId } = req.params;
  
  const running = runningProjects.get(projectId);
  if (!running) {
    return res.json({ 
      ok: true, 
      status: "not_running", 
      port: null,
      logs: []
    });
  }
  
  res.json({
    ok: true,
    status: running.status,
    port: running.port,
    startedAt: running.startedAt,
    logs: running.logs.slice(-100)
  });
});

app.get("/api/projects/:projectId/logs", async (req, res) => {
  const { projectId } = req.params;
  
  const running = runningProjects.get(projectId);
  if (!running) {
    return res.json({ ok: true, logs: [] });
  }
  
  res.json({
    ok: true,
    logs: running.logs.slice(-200)
  });
});

// ============================================================
// APPLICATION-FIRST WORKFLOW APIs
// ============================================================

// Domain Benchmarking Profiles - defines parameters for each domain
const DOMAIN_BENCHMARKING_PROFILES: Record<string, {
  name: string;
  description: string;
  parameters: Array<{
    key: string;
    label: string;
    type: 'number' | 'select';
    options?: Array<{ value: number; label: string }>;
    default: number;
    unit?: string;
    description: string;
  }>;
  databaseRecommendations: Record<string, { minValue: number; database: string; reason: string }>;
}> = {
  ami: {
    name: "Advanced Metering Infrastructure",
    description: "Smart grid and utility meter management systems",
    parameters: [
      { key: "metersDevices", label: "Number of Meters/Devices", type: "select", 
        options: [
          { value: 10000, label: "10K (Small utility)" },
          { value: 100000, label: "100K (Medium utility)" },
          { value: 1000000, label: "1M (Large utility)" },
          { value: 10000000, label: "10M+ (Enterprise)" },
        ],
        default: 100000, unit: "meters", description: "Total smart meters in the network" },
      { key: "recordsPerDay", label: "Records per Day", type: "select",
        options: [
          { value: 1000000, label: "1M (15-min intervals)" },
          { value: 10000000, label: "10M (5-min intervals)" },
          { value: 100000000, label: "100M (1-min intervals)" },
          { value: 1000000000, label: "1B+ (Real-time)" },
        ],
        default: 10000000, unit: "records", description: "Daily meter readings volume" },
      { key: "concurrentUsers", label: "Concurrent Users", type: "select",
        options: [
          { value: 50, label: "50 (Small team)" },
          { value: 200, label: "200 (Medium team)" },
          { value: 1000, label: "1000 (Large team)" },
          { value: 5000, label: "5000+ (Enterprise)" },
        ],
        default: 200, unit: "users", description: "Simultaneous system users" },
      { key: "dataRetentionYears", label: "Data Retention", type: "select",
        options: [
          { value: 1, label: "1 year" },
          { value: 3, label: "3 years" },
          { value: 5, label: "5 years" },
          { value: 10, label: "10 years" },
        ],
        default: 5, unit: "years", description: "How long to keep historical data" },
      { key: "readingIntervalMinutes", label: "Reading Interval", type: "select",
        options: [
          { value: 60, label: "Hourly" },
          { value: 15, label: "15 minutes" },
          { value: 5, label: "5 minutes" },
          { value: 1, label: "1 minute (Real-time)" },
        ],
        default: 15, unit: "minutes", description: "Frequency of meter readings" },
    ],
    databaseRecommendations: {
      recordsPerDay: { minValue: 100000000, database: "timescaledb", reason: "TimescaleDB optimized for time-series data at this scale" },
      metersDevices: { minValue: 1000000, database: "cassandra", reason: "Cassandra recommended for 1M+ devices" },
    },
  },
  healthcare: {
    name: "Healthcare",
    description: "Hospital and clinic management systems",
    parameters: [
      { key: "patients", label: "Number of Patients", type: "select",
        options: [
          { value: 1000, label: "1K (Small clinic)" },
          { value: 10000, label: "10K (Medium hospital)" },
          { value: 100000, label: "100K (Large hospital)" },
          { value: 1000000, label: "1M+ (Healthcare network)" },
        ],
        default: 10000, unit: "patients", description: "Total patient records" },
      { key: "appointmentsPerDay", label: "Appointments per Day", type: "select",
        options: [
          { value: 50, label: "50 (Small clinic)" },
          { value: 200, label: "200 (Medium)" },
          { value: 1000, label: "1000 (Large hospital)" },
          { value: 5000, label: "5000+ (Multi-location)" },
        ],
        default: 200, unit: "appointments", description: "Daily appointment volume" },
      { key: "doctors", label: "Number of Doctors", type: "select",
        options: [
          { value: 10, label: "10 (Small clinic)" },
          { value: 50, label: "50 (Medium)" },
          { value: 200, label: "200 (Large hospital)" },
          { value: 1000, label: "1000+ (Healthcare network)" },
        ],
        default: 50, unit: "doctors", description: "Medical staff count" },
      { key: "concurrentUsers", label: "Concurrent Users", type: "number", default: 100, unit: "users", description: "Simultaneous system users" },
    ],
    databaseRecommendations: {},
  },
  banking: {
    name: "Banking & Finance",
    description: "Banking and financial transaction systems",
    parameters: [
      { key: "accounts", label: "Number of Accounts", type: "select",
        options: [
          { value: 10000, label: "10K (Small bank)" },
          { value: 100000, label: "100K (Regional bank)" },
          { value: 1000000, label: "1M (National bank)" },
          { value: 10000000, label: "10M+ (Large bank)" },
        ],
        default: 100000, unit: "accounts", description: "Total customer accounts" },
      { key: "transactionsPerDay", label: "Transactions per Day", type: "select",
        options: [
          { value: 10000, label: "10K (Small)" },
          { value: 100000, label: "100K (Medium)" },
          { value: 1000000, label: "1M (Large)" },
          { value: 10000000, label: "10M+ (Enterprise)" },
        ],
        default: 100000, unit: "transactions", description: "Daily transaction volume" },
      { key: "concurrentUsers", label: "Concurrent Users", type: "number", default: 500, unit: "users", description: "Simultaneous system users" },
    ],
    databaseRecommendations: {
      transactionsPerDay: { minValue: 1000000, database: "postgresql", reason: "PostgreSQL with partitioning for high transaction volume" },
    },
  },
  ecommerce: {
    name: "E-Commerce",
    description: "Online retail and marketplace systems",
    parameters: [
      { key: "products", label: "Number of Products", type: "select",
        options: [
          { value: 1000, label: "1K (Small store)" },
          { value: 10000, label: "10K (Medium store)" },
          { value: 100000, label: "100K (Large marketplace)" },
          { value: 1000000, label: "1M+ (Enterprise)" },
        ],
        default: 10000, unit: "products", description: "Total product catalog size" },
      { key: "ordersPerDay", label: "Orders per Day", type: "select",
        options: [
          { value: 100, label: "100 (Small)" },
          { value: 1000, label: "1000 (Medium)" },
          { value: 10000, label: "10K (Large)" },
          { value: 100000, label: "100K+ (Enterprise)" },
        ],
        default: 1000, unit: "orders", description: "Daily order volume" },
      { key: "concurrentUsers", label: "Concurrent Users", type: "number", default: 500, unit: "users", description: "Simultaneous shoppers" },
    ],
    databaseRecommendations: {},
  },
};

// Get all domain benchmarking profiles
app.get("/api/domains/benchmarking", (_req, res) => {
  res.json({ 
    ok: true, 
    domains: Object.entries(DOMAIN_BENCHMARKING_PROFILES).map(([id, profile]) => ({
      id,
      name: profile.name,
      description: profile.description,
      parameters: profile.parameters,
    })),
  });
});

// Get benchmarking profile for a specific domain
app.get("/api/domains/:domain/benchmarking", (req, res) => {
  const profile = DOMAIN_BENCHMARKING_PROFILES[req.params.domain.toLowerCase()];
  if (!profile) {
    return res.status(404).json({ error: "Domain not found", availableDomains: Object.keys(DOMAIN_BENCHMARKING_PROFILES) });
  }
  res.json({ ok: true, domain: req.params.domain, ...profile });
});

// Update project benchmarking configuration
app.put("/api/projects/:projectId/benchmarking", async (req, res) => {
  try {
    const { benchmarking } = req.body;
    if (!benchmarking) {
      return res.status(400).json({ error: "benchmarking configuration is required" });
    }
    
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Calculate database recommendation based on benchmarking
    const domainProfile = DOMAIN_BENCHMARKING_PROFILES[project.domain?.toLowerCase() || ''];
    let recommendedDatabase = project.database || 'postgresql';
    let databaseReason = 'Default choice for most applications';
    
    if (domainProfile) {
      for (const [param, rule] of Object.entries(domainProfile.databaseRecommendations)) {
        if (benchmarking[param] >= rule.minValue) {
          recommendedDatabase = rule.database;
          databaseReason = rule.reason;
          break;
        }
      }
    }
    
    // Calculate estimated storage
    const recordsPerDay = benchmarking.recordsPerDay || benchmarking.transactionsPerDay || benchmarking.ordersPerDay || 10000;
    const retentionYears = benchmarking.dataRetentionYears || 3;
    const avgRecordSizeKB = 0.5; // 500 bytes per record estimate
    const estimatedStorageGB = Math.ceil((recordsPerDay * 365 * retentionYears * avgRecordSizeKB) / (1024 * 1024));
    
    await db.update(projects)
      .set({
        benchmarking: { ...benchmarking, estimatedStorageGB },
        database: recommendedDatabase,
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({ 
      ok: true, 
      benchmarking: { ...benchmarking, estimatedStorageGB },
      recommendation: {
        database: recommendedDatabase,
        reason: databaseReason,
        estimatedStorageGB,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update benchmarking", details: e?.message || String(e) });
  }
});

// Provision database for a project - creates real tables from module definitions
app.post("/api/projects/:projectId/database/provision", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const modules = (project.modules as any) || [];
    const completedModules = modules.filter((m: any) => m.status === 'completed' || m.tables?.length > 0);
    
    if (completedModules.length === 0) {
      return res.status(400).json({ error: "No modules with tables found. Build modules first using the AI agent." });
    }
    
    console.log(`Provisioning database for project ${project.name} with ${completedModules.length} modules...`);
    
    const result = await provisionProjectDatabase(req.params.projectId, completedModules);
    
    res.json({
      ok: true,
      provisioned: result.success,
      tables: result.tables,
      errors: result.errors,
      message: result.success 
        ? `Successfully created ${result.tables.length} tables in the database.`
        : `Partially completed. Created ${result.tables.length} tables with ${result.errors.length} errors.`
    });
  } catch (e: any) {
    console.error("Database provisioning failed:", e);
    res.status(500).json({ error: "Failed to provision database", details: e?.message || String(e) });
  }
});

// Get database status for a project
app.get("/api/projects/:projectId/database", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const tables = await getProjectTables(req.params.projectId);
    
    res.json({
      ok: true,
      provisioned: tables.length > 0,
      tables: tables.map(t => t.replace(`ipl_${req.params.projectId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}_`, '')),
      rawTables: tables
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get database status", details: e?.message || String(e) });
  }
});

// Get data from a specific table
app.get("/api/projects/:projectId/database/:tableName", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await getTableData(req.params.projectId, req.params.tableName, limit);
    
    res.json({
      ok: true,
      table: req.params.tableName,
      columns: data.columns,
      rows: data.rows,
      count: data.rows.length
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get table data", details: e?.message || String(e) });
  }
});

// Insert sample data into a table
app.post("/api/projects/:projectId/database/:tableName/data", async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "data must be an array of records" });
    }
    
    const result = await insertSampleData(req.params.projectId, req.params.tableName, data);
    
    res.json({
      ok: true,
      inserted: result.inserted,
      success: result.success
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to insert data", details: e?.message || String(e) });
  }
});

// Drop all project tables (cleanup)
app.delete("/api/projects/:projectId/database", async (req, res) => {
  try {
    const result = await dropProjectTables(req.params.projectId);
    
    res.json({
      ok: true,
      dropped: result.dropped,
      success: result.success
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to drop tables", details: e?.message || String(e) });
  }
});

// Generate preview of the application (build and run)
app.post("/api/projects/:projectId/preview", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const modules = (project.modules as any) || [];
    const completedModules = modules.filter((m: any) => m.status === 'completed' || m.tables?.length > 0);
    
    if (completedModules.length === 0) {
      return res.status(400).json({ error: "No modules built yet. Use the AI agent to build modules first." });
    }
    
    // Update preview status
    await db.update(projects)
      .set({
        previewStatus: { status: 'building', startedAt: new Date().toISOString() },
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    // In a real implementation, this would:
    // 1. Generate complete code from modules
    // 2. Set up database and run migrations
    // 3. Start the server in a container
    // 4. Return the preview URL
    
    // For now, return a simulated preview
    const previewUrl = `https://${req.params.projectId}-preview.replit.dev`;
    
    await db.update(projects)
      .set({
        previewStatus: { 
          status: 'running', 
          url: previewUrl,
          port: 3000,
          startedAt: new Date().toISOString(),
          logs: ['Building application...', 'Running database migrations...', 'Starting server...', 'Preview ready!'],
        },
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({ 
      ok: true, 
      preview: {
        status: 'running',
        url: previewUrl,
        modules: completedModules.map((m: any) => m.name),
        message: "Application preview is now running. Test your app and report any issues.",
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to start preview", details: e?.message || String(e) });
  }
});

// Get preview status
app.get("/api/projects/:projectId/preview", async (req, res) => {
  try {
    const [project] = await db.select({
      previewStatus: projects.previewStatus,
      modules: projects.modules,
    }).from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json({ ok: true, preview: project.previewStatus, modules: project.modules });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get preview status", details: e?.message || String(e) });
  }
});

// Report an issue for AI to analyze and fix
app.post("/api/projects/:projectId/issues", async (req, res) => {
  try {
    const { type, source, message, stackTrace } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const issueId = `issue-${Date.now()}`;
    const newIssue = {
      id: issueId,
      type: type || 'error',
      source: source || 'api',
      message,
      stackTrace,
      status: 'detected' as const,
      createdAt: new Date().toISOString(),
    };
    
    const currentIssues = (project.issues as any) || [];
    
    await db.update(projects)
      .set({
        issues: [...currentIssues, newIssue],
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({ ok: true, issue: newIssue, message: "Issue reported. Use /issues/:issueId/analyze to get AI analysis and fix." });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to report issue", details: e?.message || String(e) });
  }
});

// Get all issues for a project
app.get("/api/projects/:projectId/issues", async (req, res) => {
  try {
    const [project] = await db.select({
      issues: projects.issues,
    }).from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json({ ok: true, issues: project.issues || [] });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get issues", details: e?.message || String(e) });
  }
});

// AI analyze and fix an issue (like how I debug!)
app.post("/api/projects/:projectId/issues/:issueId/fix", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI issue fixing requires GROQ_API_KEY" });
    }
    
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const issues = (project.issues as any) || [];
    const issueIndex = issues.findIndex((i: any) => i.id === req.params.issueId);
    
    if (issueIndex === -1) {
      return res.status(404).json({ error: "Issue not found" });
    }
    
    const issue = issues[issueIndex];
    
    // Update status to analyzing
    issues[issueIndex].status = 'analyzing';
    await db.update(projects)
      .set({ issues, updatedAt: new Date() })
      .where(eq(projects.projectId, req.params.projectId));
    
    // Use AI to analyze and fix the issue
    const modules = (project.modules as any) || [];
    const context = {
      projectName: project.name,
      domain: project.domain,
      modules: modules.map((m: any) => ({
        name: m.name,
        tables: m.tables,
        apis: m.apis,
      })),
      issue: {
        type: issue.type,
        source: issue.source,
        message: issue.message,
        stackTrace: issue.stackTrace,
      },
    };
    
    // Call AI to analyze and suggest fix
    const aiAnalysis = await runFixCode(
      JSON.stringify(context, null, 2), // code context
      'typescript', // language
      [issue.message, issue.stackTrace || ''].filter(Boolean) // issues array
    );
    
    // Update issue with AI analysis
    issues[issueIndex] = {
      ...issue,
      status: 'fixed',
      aiAnalysis: aiAnalysis.explanation || 'Issue analyzed',
      suggestedFix: aiAnalysis.fixedCode || 'See AI analysis for recommendations',
      fixedAt: new Date().toISOString(),
    };
    
    await db.update(projects)
      .set({ issues, updatedAt: new Date() })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({ 
      ok: true, 
      issue: issues[issueIndex],
      aiGenerated: true,
      analysis: aiAnalysis.explanation,
      suggestedFix: aiAnalysis.fixedCode,
      message: "Issue analyzed and fix suggested. Review the fix and apply if appropriate.",
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to analyze issue", details: e?.message || String(e) });
  }
});

// Verify application works and move to infrastructure phase
app.post("/api/projects/:projectId/verify-application", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const modules = (project.modules as any) || [];
    const completedModules = modules.filter((m: any) => m.status === 'completed' || m.tables?.length > 0);
    const openIssues = ((project.issues as any) || []).filter((i: any) => i.status !== 'fixed' && i.status !== 'ignored');
    
    if (completedModules.length === 0) {
      return res.status(400).json({ error: "No modules completed yet. Build modules first." });
    }
    
    if (openIssues.length > 0) {
      return res.status(400).json({ 
        error: "There are unresolved issues. Fix or ignore them before verifying.",
        openIssues: openIssues.length,
      });
    }
    
    await db.update(projects)
      .set({
        applicationVerified: "true",
        status: "ready_for_infrastructure",
        updatedAt: new Date(),
      })
      .where(eq(projects.projectId, req.params.projectId));
    
    res.json({ 
      ok: true, 
      message: "Application verified! You can now proceed to infrastructure setup.",
      completedModules: completedModules.map((m: any) => m.name),
      nextPhase: "Use /api/projects/:projectId/infrastructure/recommend to get cloud/on-prem recommendations",
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to verify application", details: e?.message || String(e) });
  }
});

// Get infrastructure recommendations based on benchmarking
app.post("/api/projects/:projectId/infrastructure/recommend", async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, req.params.projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    if (project.applicationVerified !== "true") {
      return res.status(400).json({ 
        error: "Application must be verified first. Use /verify-application endpoint.",
      });
    }
    
    const benchmarking = (project.benchmarking as any) || {};
    const modules = (project.modules as any) || [];
    
    // Calculate infrastructure needs based on benchmarking
    const recordsPerDay = benchmarking.recordsPerDay || benchmarking.transactionsPerDay || 10000;
    const concurrentUsers = benchmarking.concurrentUsers || 100;
    const storageGB = benchmarking.estimatedStorageGB || 100;
    
    // Determine tier
    let tier = 'small';
    let cpu = 2;
    let memoryGB = 4;
    let replicas = 1;
    
    if (recordsPerDay > 10000000 || concurrentUsers > 1000) {
      tier = 'massive';
      cpu = 16;
      memoryGB = 64;
      replicas = 5;
    } else if (recordsPerDay > 1000000 || concurrentUsers > 500) {
      tier = 'large';
      cpu = 8;
      memoryGB = 32;
      replicas = 3;
    } else if (recordsPerDay > 100000 || concurrentUsers > 100) {
      tier = 'medium';
      cpu = 4;
      memoryGB = 16;
      replicas = 2;
    }
    
    const infrastructure = {
      tier,
      compute: { cpu, memoryGB, replicas },
      database: {
        type: project.database,
        storageGB,
        iops: tier === 'massive' ? 10000 : tier === 'large' ? 5000 : 3000,
        replicas: tier === 'massive' ? 3 : tier === 'large' ? 2 : 1,
      },
      caching: recordsPerDay > 1000000 ? { type: 'redis', memoryGB: tier === 'massive' ? 16 : 8 } : null,
      messageQueue: recordsPerDay > 10000000 ? { type: 'kafka', partitions: 12 } : null,
      loadBalancer: replicas > 1,
      cdn: true,
      monitoring: { prometheus: true, grafana: true },
    };
    
    // Cloud cost estimates
    const cloudCosts = {
      aws: { monthly: (cpu * 50 + memoryGB * 5 + storageGB * 0.1) * replicas },
      azure: { monthly: (cpu * 48 + memoryGB * 4.8 + storageGB * 0.09) * replicas },
      gcp: { monthly: (cpu * 45 + memoryGB * 4.5 + storageGB * 0.08) * replicas },
    };
    
    res.json({
      ok: true,
      applicationSummary: {
        modules: modules.length,
        tables: modules.reduce((acc: number, m: any) => acc + (m.tables?.length || 0), 0),
        apis: modules.reduce((acc: number, m: any) => acc + (m.apis?.length || 0), 0),
      },
      benchmarking,
      infrastructure,
      cloudCosts,
      deploymentOptions: ['cloud', 'on-premises', 'hybrid'],
      nextSteps: [
        "Choose cloud provider or on-premises deployment",
        "Generate CI/CD pipelines",
        "Generate Docker/Kubernetes configurations",
        "Deploy application",
      ],
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to generate recommendations", details: e?.message || String(e) });
  }
});

// AI-powered domain module recommendations
app.post("/api/recommend-modules", async (req, res) => {
  try {
    const { domain, existingModules } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: "domain is required" });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI module recommendations require GROQ_API_KEY" });
    }
    
    console.log(`Recommending modules for domain: ${domain}`);
    const result = await groqRecommendDomainModules({
      domain,
      existingModules: existingModules || [],
    });
    
    res.json({ ok: true, aiGenerated: true, ...result });
  } catch (e: any) {
    console.error("Module recommendation failed:", e);
    res.status(500).json({ error: "Module recommendation failed", details: e?.message || String(e) });
  }
});

// AI-powered single module generation
app.post("/api/generate-module", async (req, res) => {
  try {
    const { domain, moduleName, moduleDescription, database, framework, existingTables } = req.body;
    
    if (!domain || !moduleName) {
      return res.status(400).json({ error: "domain and moduleName are required" });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(400).json({ error: "AI module generation requires GROQ_API_KEY" });
    }
    
    console.log(`Generating module: ${moduleName} for domain: ${domain}`);
    const result = await groqGenerateSingleModule({
      domain,
      moduleName,
      moduleDescription,
      database: database || "postgresql",
      framework: framework || "express",
      existingTables: existingTables || [],
    });
    
    res.json({ ok: true, aiGenerated: true, ...result });
  } catch (e: any) {
    console.error("Module generation failed:", e);
    res.status(500).json({ error: "Module generation failed", details: e?.message || String(e) });
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

app.post("/api/parse-document", upload.single("file") as any, async (req, res) => {
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

app.post("/api/ai/generate-infrastructure", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.cloudProvider) {
      return res.status(400).json({ error: "domain and cloudProvider are required" });
    }

    console.log("AI Infrastructure generation request:", config.projectName || config.domain);
    const result = await groqGenerateInfrastructure(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI Infrastructure generation failed:", e);
    res.status(500).json({ error: "AI Infrastructure generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-cicd", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.platform) {
      return res.status(400).json({ error: "domain and platform are required" });
    }

    console.log("AI CI/CD generation request:", config.projectName || config.domain);
    const result = await groqGenerateCICD(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI CI/CD generation failed:", e);
    res.status(500).json({ error: "AI CI/CD generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-migrations", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.database || !config.tables) {
      return res.status(400).json({ error: "domain, database, and tables are required" });
    }

    console.log("AI Migrations generation request:", config.projectName || config.domain);
    const result = await groqGenerateMigrations(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI Migrations generation failed:", e);
    res.status(500).json({ error: "AI Migrations generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-auth", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.framework || !config.authType) {
      return res.status(400).json({ error: "domain, framework, and authType are required" });
    }

    console.log("AI Auth generation request:", config.projectName || config.domain);
    const result = await groqGenerateAuth(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI Auth generation failed:", e);
    res.status(500).json({ error: "AI Auth generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-load-tests", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.tool || !config.baseUrl) {
      return res.status(400).json({ error: "domain, tool, and baseUrl are required" });
    }

    console.log("AI Load Tests generation request:", config.projectName || config.domain);
    const result = await groqGenerateLoadTests(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI Load Tests generation failed:", e);
    res.status(500).json({ error: "AI Load Tests generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-api-docs", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.tables) {
      return res.status(400).json({ error: "domain and tables are required" });
    }

    console.log("AI API Docs generation request:", config.projectName || config.domain);
    const result = await groqGenerateAPIDocs(config);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("AI API Docs generation failed:", e);
    res.status(500).json({ error: "AI API Docs generation failed", details: e?.message || String(e) });
  }
});

app.post("/api/ai/generate-all-devops", async (req, res) => {
  try {
    const config = req.body;
    
    if (!config.domain || !config.tables) {
      return res.status(400).json({ error: "domain and tables are required" });
    }

    console.log("AI Full DevOps generation request:", config.projectName || config.domain);

    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    if (config.infrastructure) {
      try {
        results.infrastructure = await groqGenerateInfrastructure({
          ...config,
          cloudProvider: config.cloudProvider || 'aws',
          region: config.region || 'us-east-1',
          environment: config.environment || 'production',
          services: config.services || ['web', 'api'],
        });
      } catch (e: any) {
        errors.infrastructure = e?.message || String(e);
      }
    }

    if (config.cicd) {
      try {
        results.cicd = await groqGenerateCICD({
          ...config,
          platform: config.cicdPlatform || 'github',
          language: config.language || 'nodejs',
          deploymentTarget: config.deploymentTarget || 'kubernetes',
          environments: config.environments || ['development', 'staging', 'production'],
          features: config.cicdFeatures || {
            unitTests: true,
            integrationTests: true,
            e2eTests: false,
            securityScan: true,
            codeQuality: true,
            containerBuild: true,
            autoRelease: false,
          },
        });
      } catch (e: any) {
        errors.cicd = e?.message || String(e);
      }
    }

    if (config.migrations) {
      try {
        results.migrations = await groqGenerateMigrations({
          ...config,
          orm: config.orm || 'drizzle',
          auditColumns: config.auditColumns ?? true,
          softDelete: config.softDelete ?? false,
          seedData: config.seedData ?? true,
        });
      } catch (e: any) {
        errors.migrations = e?.message || String(e);
      }
    }

    if (config.auth) {
      try {
        results.auth = await groqGenerateAuth({
          ...config,
          framework: config.authFramework || 'express',
          authType: config.authType || 'jwt',
          mfa: config.mfa ?? false,
          rbac: config.rbac ?? true,
          roles: config.roles || ['user', 'admin'],
        });
      } catch (e: any) {
        errors.auth = e?.message || String(e);
      }
    }

    if (config.loadTests) {
      try {
        results.loadTests = await groqGenerateLoadTests({
          ...config,
          tool: config.loadTestTool || 'k6',
          baseUrl: config.baseUrl || 'http://localhost:3000',
          endpoints: config.endpoints || [
            { method: 'GET', path: '/api/health' },
            { method: 'GET', path: '/api/users' },
          ],
          scenarios: config.scenarios || {
            smoke: { vus: 5, duration: '1m' },
            load: { vus: 50, duration: '5m' },
            stress: { vus: 100, duration: '10m' },
          },
          thresholds: config.thresholds || {
            p95ResponseTime: 500,
            p99ResponseTime: 1000,
            errorRate: 1,
          },
        });
      } catch (e: any) {
        errors.loadTests = e?.message || String(e);
      }
    }

    if (config.apiDocs) {
      try {
        results.apiDocs = await groqGenerateAPIDocs({
          ...config,
          version: config.apiVersion || '1.0.0',
          baseUrl: config.apiBaseUrl || 'https://api.example.com',
          description: config.apiDescription || `${config.domain} API`,
          authentication: config.apiAuth || 'jwt',
        });
      } catch (e: any) {
        errors.apiDocs = e?.message || String(e);
      }
    }

    res.json({ 
      ok: true, 
      data: results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error("AI Full DevOps generation failed:", e);
    res.status(500).json({ error: "AI Full DevOps generation failed", details: e?.message || String(e) });
  }
});

// ====================
// Git Operations API
// ====================
import { execSync, exec, execFile } from "child_process";
import { promisify } from "util";
import { getProjectDir } from "./generators/code-materializer.js";
import * as fs from "fs";
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Sanitize projectId to prevent directory traversal attacks
function sanitizeProjectId(projectId: string | undefined): string | null {
  if (!projectId) return null;
  // Only allow alphanumeric, hyphens, and underscores
  const sanitized = projectId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized !== projectId || sanitized.length === 0 || sanitized.length > 100) {
    return null;
  }
  return sanitized;
}

app.get("/api/git/status", async (req, res) => {
  try {
    const rawProjectId = req.query.projectId as string;
    const projectId = sanitizeProjectId(rawProjectId);
    
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "Invalid or missing projectId" });
    }
    
    const projectDir = await getProjectDir(projectId);
    if (!projectDir || !fs.existsSync(projectDir)) {
      return res.status(404).json({ ok: false, error: "Project directory not found" });
    }
    
    const [status, branch, log] = await Promise.all([
      execFileAsync('git', ['status', '--porcelain'], { cwd: projectDir }).catch(() => ({ stdout: '' })),
      execFileAsync('git', ['branch', '--show-current'], { cwd: projectDir }).catch(() => ({ stdout: 'main' })),
      execFileAsync('git', ['log', '-10', '--format=%h|%s|%cr|%an'], { cwd: projectDir }).catch(() => ({ stdout: '' }))
    ]);
    
    const changedFiles = (status as any).stdout.split('\n').filter(Boolean).map((line: string) => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3);
      return { status, file, statusLabel: status === 'M' ? 'Modified' : status === 'A' ? 'Added' : status === 'D' ? 'Deleted' : status === '??' ? 'Untracked' : status };
    });
    
    const commits = (log as any).stdout.split('\n').filter(Boolean).map((line: string) => {
      const [hash, message, time, author] = line.split('|');
      return { hash, message, time, author };
    });
    
    res.json({
      ok: true,
      data: {
        branch: (branch as any).stdout.trim(),
        changedFiles,
        changedCount: changedFiles.length,
        commits
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post("/api/git/commit", async (req, res) => {
  try {
    const { projectId: rawProjectId, message } = req.body;
    const projectId = sanitizeProjectId(rawProjectId);
    
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "Invalid or missing projectId" });
    }
    
    const projectDir = await getProjectDir(projectId);
    if (!projectDir || !fs.existsSync(projectDir)) {
      return res.status(404).json({ ok: false, error: "Project directory not found" });
    }
    
    await execFileAsync('git', ['add', '-A'], { cwd: projectDir });
    const { stdout } = await execFileAsync('git', ['commit', '-m', message], { cwd: projectDir });
    
    res.json({
      ok: true,
      data: {
        message,
        output: stdout.slice(0, 2000)
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post("/api/git/push", async (req, res) => {
  try {
    const { projectId: rawProjectId } = req.body;
    const projectId = sanitizeProjectId(rawProjectId);
    
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "Invalid or missing projectId" });
    }
    
    const projectDir = await getProjectDir(projectId);
    if (!projectDir || !fs.existsSync(projectDir)) {
      return res.status(404).json({ ok: false, error: "Project directory not found" });
    }
    
    const { stdout, stderr } = await execFileAsync('git', ['push'], { cwd: projectDir, timeout: 60000 });
    
    res.json({
      ok: true,
      data: {
        output: ((stdout || '') + (stderr || '')).slice(0, 2000)
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post("/api/git/pull", async (req, res) => {
  try {
    const { projectId: rawProjectId } = req.body;
    const projectId = sanitizeProjectId(rawProjectId);
    
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "Invalid or missing projectId" });
    }
    
    const projectDir = await getProjectDir(projectId);
    if (!projectDir || !fs.existsSync(projectDir)) {
      return res.status(404).json({ ok: false, error: "Project directory not found" });
    }
    
    const { stdout, stderr } = await execFileAsync('git', ['pull'], { cwd: projectDir, timeout: 60000 });
    
    res.json({
      ok: true,
      data: {
        output: ((stdout || '') + (stderr || '')).slice(0, 2000)
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ====================
// Database Operations API
// ====================
app.get("/api/database/tables", async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    const showAll = req.query.showAll === 'true';
    
    if (!projectId && !showAll) {
      return res.status(400).json({ ok: false, error: "projectId required" });
    }
    
    let tables: Array<{ name: string; columns: string[]; rowCount: number }> = [];
    
    if (showAll || !projectId) {
      // Get all public tables
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      for (const row of result.rows as any[]) {
        const tableName = row.table_name;
        try {
          // Get columns
          const colResult = await db.execute(sql`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = ${tableName} ORDER BY ordinal_position
          `);
          const columns = (colResult.rows as any[]).map(r => r.column_name);
          
          // Get row count
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
          const rowCount = parseInt((countResult.rows as any[])[0]?.count || '0');
          
          tables.push({ name: tableName, columns, rowCount });
        } catch (e) {
          tables.push({ name: tableName, columns: [], rowCount: 0 });
        }
      }
    } else {
      // Get project-specific tables
      const projectTables = await getProjectTables(projectId);
      for (const tableName of projectTables) {
        try {
          const colResult = await db.execute(sql`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = ${tableName} ORDER BY ordinal_position
          `);
          const columns = (colResult.rows as any[]).map(r => r.column_name);
          
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
          const rowCount = parseInt((countResult.rows as any[])[0]?.count || '0');
          
          tables.push({ name: tableName, columns, rowCount });
        } catch (e) {
          tables.push({ name: tableName, columns: [], rowCount: 0 });
        }
      }
    }
    
    res.json({ ok: true, data: tables });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.get("/api/database/table/:tableName", async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "projectId required" });
    }
    
    const data = await getTableData(projectId, tableName, limit);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post("/api/database/query", async (req, res) => {
  try {
    const { projectId, query } = req.body;
    if (!projectId || !query) {
      return res.status(400).json({ ok: false, error: "projectId and query required" });
    }
    
    // Only allow SELECT queries for safety
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith('SELECT')) {
      return res.status(400).json({ ok: false, error: "Only SELECT queries allowed for safety" });
    }
    
    const result = await db.execute(query);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ====================
// Secrets Management API (in-memory for demo, would use env in production)
// ====================
const projectSecrets = new Map<string, Map<string, string>>();

app.get("/api/secrets", (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    return res.status(400).json({ ok: false, error: "projectId required" });
  }
  
  const secrets = projectSecrets.get(projectId) || new Map();
  const maskedSecrets = Array.from(secrets.entries()).map(([key]) => ({
    key,
    masked: '••••••••',
    hasValue: true
  }));
  
  res.json({ ok: true, data: maskedSecrets });
});

app.post("/api/secrets", (req, res) => {
  const { projectId, key, value } = req.body;
  if (!projectId || !key || !value) {
    return res.status(400).json({ ok: false, error: "projectId, key, and value required" });
  }
  
  if (!projectSecrets.has(projectId)) {
    projectSecrets.set(projectId, new Map());
  }
  projectSecrets.get(projectId)!.set(key, value);
  
  res.json({ ok: true, message: `Secret ${key} saved` });
});

app.delete("/api/secrets/:key", (req, res) => {
  const projectId = req.query.projectId as string;
  const { key } = req.params;
  
  if (!projectId) {
    return res.status(400).json({ ok: false, error: "projectId required" });
  }
  
  const secrets = projectSecrets.get(projectId);
  if (secrets) {
    secrets.delete(key);
  }
  
  res.json({ ok: true, message: `Secret ${key} deleted` });
});

// ====================
// Project Settings API
// ====================
app.get("/api/project/:projectId/settings", async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await db.select().from(projects).where(eq(projects.projectId, projectId)).limit(1);
    
    if (!project.length) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }
    
    res.json({
      ok: true,
      data: {
        name: project[0].name,
        domain: project[0].domain,
        database: project[0].database,
        status: project[0].status,
        nodeVersion: '20',
        packageManager: 'npm'
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.put("/api/project/:projectId/settings", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, nodeVersion, packageManager } = req.body;
    
    if (name) {
      await db.update(projects).set({ name }).where(eq(projects.projectId, projectId));
    }
    
    res.json({ ok: true, message: "Settings updated" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ====================
// Tab Preferences API
// ====================
const projectTabPrefs = new Map<string, string[]>();

app.get("/api/project/:projectId/tabs", (req, res) => {
  const { projectId } = req.params;
  const tabs = projectTabPrefs.get(projectId) || ['preview', 'console', 'git'];
  res.json({ ok: true, data: tabs });
});

app.put("/api/project/:projectId/tabs", (req, res) => {
  const { projectId } = req.params;
  const { tabs } = req.body;
  
  if (!Array.isArray(tabs)) {
    return res.status(400).json({ ok: false, error: "tabs must be an array" });
  }
  
  projectTabPrefs.set(projectId, tabs);
  res.json({ ok: true, message: "Tab preferences saved" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Generator on :${PORT}`);
  const llmProvider = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ? "Claude (Anthropic)" : 
                      process.env.GROQ_API_KEY ? "Groq (Llama 3.3)" : "mock";
  console.log(`LLM Provider: ${llmProvider}`);
});
