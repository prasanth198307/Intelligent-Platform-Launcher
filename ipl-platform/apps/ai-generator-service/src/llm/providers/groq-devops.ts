import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL
  });
};

export interface InfrastructureConfig {
  domain: string;
  projectName: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  region: string;
  environment: 'development' | 'staging' | 'production';
  services: string[];
  database: string;
  cache?: boolean;
  messageQueue?: boolean;
  containerRegistry?: boolean;
  scaling?: { min: number; max: number };
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
  modules: Array<{ name: string; description: string }>;
}

export interface GeneratedInfrastructure {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  estimatedCost?: string;
}

export async function groqGenerateInfrastructure(config: InfrastructureConfig): Promise<GeneratedInfrastructure> {
  const client = getClient();

  const servicesList = config.services?.join(', ') || 'web app, api';
  const modulesList = config.modules?.map(m => `- ${m.name}: ${m.description}`).join('\n') || 'No modules defined';
  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || 'No tables defined';

  const prompt = `Generate complete Infrastructure as Code for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Cloud Provider: ${config.cloudProvider.toUpperCase()}
Region: ${config.region}
Environment: ${config.environment}
Services: ${servicesList}
Database: ${config.database}
Redis Cache: ${config.cache ? 'Yes' : 'No'}
Message Queue: ${config.messageQueue ? 'Yes' : 'No'}
Container Registry: ${config.containerRegistry ? 'Yes' : 'No'}
Auto-scaling: ${config.scaling ? `${config.scaling.min}-${config.scaling.max} instances` : 'No'}

MODULES:
${modulesList}

DATABASE TABLES:
${tablesList}

Generate COMPLETE infrastructure with these files:

1. terraform/main.tf - Main Terraform configuration with:
   - Provider setup for ${config.cloudProvider}
   - VPC/Network configuration
   - Database (${config.database}) with proper security
   - Container orchestration (ECS/AKS/GKE)
   - Load balancer
   ${config.cache ? '- Redis/ElastiCache cluster' : ''}
   ${config.messageQueue ? '- Message queue (SQS/Service Bus/Pub-Sub)' : ''}

2. terraform/variables.tf - All required variables with descriptions

3. terraform/outputs.tf - Important outputs (endpoints, connection strings)

4. docker/Dockerfile - Multi-stage build optimized for Node.js/Python/Go

5. docker/docker-compose.yml - Local development with all services

6. kubernetes/deployment.yaml - K8s deployment with:
   - Resource limits
   - Health checks
   - ConfigMaps and Secrets references
   - Horizontal Pod Autoscaler

7. kubernetes/service.yaml - K8s service configuration

8. kubernetes/ingress.yaml - Ingress with TLS

9. helm/Chart.yaml - Helm chart metadata

10. helm/values.yaml - Configurable values

For ${config.domain} domain, include domain-specific infrastructure:
- Healthcare: HIPAA-compliant network isolation, encryption at rest, audit logging
- Banking: PCI-DSS compliance, private subnets, WAF rules
- AMI/Utilities: High availability, time-series optimized storage

Return ONLY valid JSON:
{
  "files": [
    {"path": "terraform/main.tf", "content": "...", "description": "..."}
  ],
  "instructions": "How to deploy the infrastructure",
  "estimatedCost": "Monthly cost estimate"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    console.log("Generating infrastructure with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert DevOps/Cloud architect specializing in ${config.cloudProvider}. Generate complete, production-ready infrastructure code following best practices for security, scalability, and cost optimization.
Return ONLY valid JSON. No markdown, no explanation. Generate REAL code, not placeholders.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 16000
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

export interface CICDConfig {
  domain: string;
  projectName: string;
  platform: 'github' | 'gitlab' | 'jenkins' | 'azure-devops';
  language: 'nodejs' | 'python' | 'go' | 'java';
  framework?: string;
  database: string;
  testingFramework?: string;
  containerRegistry?: string;
  deploymentTarget: 'kubernetes' | 'ecs' | 'app-service' | 'cloud-run' | 'lambda';
  environments: string[];
  features: {
    unitTests: boolean;
    integrationTests: boolean;
    e2eTests: boolean;
    securityScan: boolean;
    codeQuality: boolean;
    containerBuild: boolean;
    autoRelease: boolean;
  };
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedCICD {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
}

export async function groqGenerateCICD(config: CICDConfig): Promise<GeneratedCICD> {
  const client = getClient();

  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || '';
  const envsList = config.environments?.join(', ') || 'development, staging, production';

  const platformFiles: Record<string, string> = {
    github: '.github/workflows/ci.yml and .github/workflows/cd.yml',
    gitlab: '.gitlab-ci.yml',
    jenkins: 'Jenkinsfile',
    'azure-devops': 'azure-pipelines.yml'
  };

  const prompt = `Generate complete CI/CD pipeline for a ${config.domain.toUpperCase()} ${config.language} application.

Project: ${config.projectName}
CI/CD Platform: ${config.platform}
Language: ${config.language}
Framework: ${config.framework || 'standard'}
Database: ${config.database}
Testing: ${config.testingFramework || 'default'}
Container Registry: ${config.containerRegistry || 'default'}
Deployment Target: ${config.deploymentTarget}
Environments: ${envsList}

FEATURES TO INCLUDE:
- Unit Tests: ${config.features.unitTests ? 'Yes' : 'No'}
- Integration Tests: ${config.features.integrationTests ? 'Yes' : 'No'}
- E2E Tests: ${config.features.e2eTests ? 'Yes' : 'No'}
- Security Scanning: ${config.features.securityScan ? 'Yes (SAST, dependency scan, container scan)' : 'No'}
- Code Quality: ${config.features.codeQuality ? 'Yes (linting, coverage, SonarQube)' : 'No'}
- Container Build: ${config.features.containerBuild ? 'Yes' : 'No'}
- Automatic Release: ${config.features.autoRelease ? 'Yes (semantic versioning)' : 'No'}

DATABASE TABLES (for test data seeding):
${tablesList}

Generate COMPLETE CI/CD configuration (${platformFiles[config.platform]}):

1. CI Pipeline with:
   - Dependency caching
   - Parallel test execution
   - Test database service containers
   - Code coverage reporting
   - Security vulnerability scanning
   - Docker image building and pushing
   - Artifact storage

2. CD Pipeline with:
   - Environment-specific deployments (${envsList})
   - Deployment approval gates for production
   - Database migration execution
   - Health check verification
   - Rollback capability
   - Slack/Teams notifications

3. Supporting files:
   - Makefile or scripts for local testing
   - .env.example for required secrets
   - Test database seeding scripts

For ${config.domain} domain, include:
- Healthcare: HIPAA compliance checks, PHI data handling tests
- Banking: Security scans, compliance gates, audit trail
- AMI: Load testing for high-volume data ingestion

Return ONLY valid JSON:
{
  "files": [
    {"path": ".github/workflows/ci.yml", "content": "...", "description": "..."}
  ],
  "instructions": "How to set up and use the pipeline"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating CI/CD pipeline with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert DevOps engineer specializing in ${config.platform} CI/CD pipelines. Generate complete, production-ready pipeline configurations following industry best practices.
Return ONLY valid JSON. No markdown. Generate REAL configuration, not placeholders.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface MigrationConfig {
  domain: string;
  projectName: string;
  database: 'postgresql' | 'mysql' | 'mssql' | 'oracle';
  orm?: 'drizzle' | 'prisma' | 'typeorm' | 'sequelize' | 'none';
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      primary?: boolean;
      unique?: boolean;
      nullable?: boolean;
      foreignKey?: string;
      default?: string;
    }>;
    indexes?: string[];
  }>;
  seedData?: boolean;
  auditColumns?: boolean;
  softDelete?: boolean;
}

export interface GeneratedMigrations {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  rollbackInstructions: string;
}

export async function groqGenerateMigrations(config: MigrationConfig): Promise<GeneratedMigrations> {
  const client = getClient();

  const tablesList = config.tables?.map(t => {
    const cols = t.columns.map(c => {
      let def = `${c.name} (${c.type})`;
      if (c.primary) def += ' PRIMARY KEY';
      if (c.unique) def += ' UNIQUE';
      if (c.foreignKey) def += ` FK->${c.foreignKey}`;
      return def;
    }).join(', ');
    return `- ${t.name}: ${cols}`;
  }).join('\n') || '';

  const prompt = `Generate complete database migration scripts for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Database: ${config.database}
ORM: ${config.orm || 'raw SQL'}
Audit Columns: ${config.auditColumns ? 'Yes (created_at, updated_at, created_by, updated_by)' : 'No'}
Soft Delete: ${config.softDelete ? 'Yes (deleted_at column)' : 'No'}
Include Seed Data: ${config.seedData ? 'Yes' : 'No'}

DATABASE TABLES:
${tablesList}

Generate COMPLETE migration files:

1. migrations/001_initial_schema.sql - Full schema creation with:
   - All tables with proper data types for ${config.database}
   - Primary keys, foreign keys, indexes
   - Constraints (unique, check, not null)
   ${config.auditColumns ? '- Audit trigger for updated_at' : ''}
   ${config.softDelete ? '- Soft delete triggers and views' : ''}

2. migrations/001_initial_schema_down.sql - Complete rollback script

${config.orm === 'drizzle' ? `3. drizzle/schema.ts - Drizzle ORM schema definition` : ''}
${config.orm === 'prisma' ? `3. prisma/schema.prisma - Prisma schema` : ''}
${config.orm === 'typeorm' ? `3. entities/*.ts - TypeORM entity classes` : ''}

${config.seedData ? `4. seeds/seed_data.sql - Sample seed data for testing` : ''}

5. migrations/README.md - Migration documentation

For ${config.domain} domain, include domain-specific:
- Healthcare: Patient, Appointment, Provider, MedicalRecord tables with HIPAA fields
- Banking: Account, Transaction, AuditLog tables with financial precision
- AMI: Meter, Reading, Alert, Consumption tables with time-series optimization

Return ONLY valid JSON:
{
  "files": [
    {"path": "migrations/001_initial_schema.sql", "content": "...", "description": "..."}
  ],
  "instructions": "How to run migrations",
  "rollbackInstructions": "How to rollback"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating migrations with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert database architect specializing in ${config.database}. Generate complete, production-ready migration scripts with proper indexing, constraints, and ${config.orm || 'SQL'} schemas.
Return ONLY valid JSON. No markdown. Generate REAL SQL and schema code.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface AuthConfig {
  domain: string;
  projectName: string;
  framework: 'express' | 'fastapi' | 'gin' | 'spring';
  authType: 'jwt' | 'oauth' | 'both';
  oauthProviders?: ('google' | 'github' | 'microsoft' | 'okta')[];
  mfa?: boolean;
  rbac?: boolean;
  roles?: string[];
  sessionManagement?: 'stateless' | 'redis' | 'database';
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
  };
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedAuth {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  securityNotes: string[];
}

export async function groqGenerateAuth(config: AuthConfig): Promise<GeneratedAuth> {
  const client = getClient();

  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || '';
  const providersList = config.oauthProviders?.join(', ') || 'none';
  const rolesList = config.roles?.join(', ') || 'user, admin';

  const frameworkLang: Record<string, string> = {
    express: 'TypeScript/Node.js',
    fastapi: 'Python',
    gin: 'Go',
    spring: 'Java'
  };

  const prompt = `Generate complete authentication system for a ${config.domain.toUpperCase()} ${frameworkLang[config.framework]} application.

Project: ${config.projectName}
Framework: ${config.framework}
Auth Type: ${config.authType}
OAuth Providers: ${providersList}
MFA Enabled: ${config.mfa ? 'Yes (TOTP)' : 'No'}
RBAC: ${config.rbac ? 'Yes' : 'No'}
Roles: ${rolesList}
Session Management: ${config.sessionManagement || 'stateless'}

PASSWORD POLICY:
${config.passwordPolicy ? `
- Min Length: ${config.passwordPolicy.minLength}
- Require Uppercase: ${config.passwordPolicy.requireUppercase}
- Require Numbers: ${config.passwordPolicy.requireNumbers}
- Require Special: ${config.passwordPolicy.requireSpecial}
` : 'Default strong policy'}

DATABASE TABLES:
${tablesList}

Generate COMPLETE authentication system:

1. auth/middleware.ts - Authentication middleware with:
   - JWT verification
   - Role-based access control
   - Rate limiting
   - Session validation

2. auth/jwt.ts - JWT token management:
   - Access token generation (short-lived)
   - Refresh token generation (long-lived)
   - Token rotation
   - Blacklisting for logout

3. auth/password.ts - Password handling:
   - Secure hashing (bcrypt/argon2)
   - Password policy validation
   - Password reset flow

${config.mfa ? `4. auth/mfa.ts - Multi-factor authentication:
   - TOTP setup and verification
   - Backup codes
   - Recovery flow` : ''}

${config.oauthProviders?.length ? `5. auth/oauth.ts - OAuth integration:
   - Provider configuration (${providersList})
   - Callback handling
   - Account linking` : ''}

6. auth/routes.ts - Auth API endpoints:
   - POST /auth/register
   - POST /auth/login
   - POST /auth/logout
   - POST /auth/refresh
   - POST /auth/forgot-password
   - POST /auth/reset-password
   ${config.mfa ? '- POST /auth/mfa/setup\n   - POST /auth/mfa/verify' : ''}
   ${config.oauthProviders?.length ? '- GET /auth/oauth/:provider\n   - GET /auth/oauth/:provider/callback' : ''}

7. auth/types.ts - TypeScript types/interfaces

For ${config.domain} domain security requirements:
- Healthcare: HIPAA-compliant session handling, PHI access logging
- Banking: PCI-DSS password requirements, session timeout, IP whitelisting
- AMI: Device authentication, API key management

Return ONLY valid JSON:
{
  "files": [
    {"path": "src/auth/middleware.ts", "content": "...", "description": "..."}
  ],
  "instructions": "Setup and configuration instructions",
  "securityNotes": ["Important security considerations"]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating authentication with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a security expert specializing in ${config.framework} authentication. Generate complete, secure, production-ready authentication code following OWASP best practices.
Return ONLY valid JSON. No markdown. Generate REAL, secure code - never use placeholder secrets or weak configurations.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface LoadTestConfig {
  domain: string;
  projectName: string;
  tool: 'k6' | 'jmeter' | 'artillery' | 'locust';
  baseUrl: string;
  endpoints: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    payload?: Record<string, any>;
    headers?: Record<string, string>;
    weight?: number;
  }>;
  scenarios: {
    smoke: { vus: number; duration: string };
    load: { vus: number; duration: string };
    stress: { vus: number; duration: string };
    spike?: { vus: number; duration: string };
  };
  thresholds: {
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    tokenEndpoint?: string;
  };
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedLoadTests {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  expectedMetrics: string;
}

export async function groqGenerateLoadTests(config: LoadTestConfig): Promise<GeneratedLoadTests> {
  const client = getClient();

  const endpointsList = config.endpoints?.map(e => 
    `- ${e.method} ${e.path} (weight: ${e.weight || 1})`
  ).join('\n') || '';
  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || '';

  const toolLang: Record<string, string> = {
    k6: 'JavaScript',
    jmeter: 'XML/JMX',
    artillery: 'YAML + JavaScript',
    locust: 'Python'
  };

  const prompt = `Generate complete load testing suite for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Tool: ${config.tool} (${toolLang[config.tool]})
Base URL: ${config.baseUrl}
Authentication: ${config.authentication ? config.authentication.type : 'None'}

ENDPOINTS TO TEST:
${endpointsList}

SCENARIOS:
- Smoke Test: ${config.scenarios.smoke.vus} VUs for ${config.scenarios.smoke.duration}
- Load Test: ${config.scenarios.load.vus} VUs for ${config.scenarios.load.duration}
- Stress Test: ${config.scenarios.stress.vus} VUs for ${config.scenarios.stress.duration}
${config.scenarios.spike ? `- Spike Test: ${config.scenarios.spike.vus} VUs for ${config.scenarios.spike.duration}` : ''}

THRESHOLDS:
- 95th percentile response time: <${config.thresholds.p95ResponseTime}ms
- 99th percentile response time: <${config.thresholds.p99ResponseTime}ms
- Error rate: <${config.thresholds.errorRate}%

DATABASE TABLES (for realistic test data):
${tablesList}

Generate COMPLETE load testing suite:

1. tests/load/main-test.${config.tool === 'k6' ? 'js' : config.tool === 'locust' ? 'py' : config.tool === 'artillery' ? 'yml' : 'jmx'} - Main test script with:
   - All scenarios (smoke, load, stress${config.scenarios.spike ? ', spike' : ''})
   - Realistic user flows
   - Proper think times
   - Threshold validations
   - Custom metrics

2. tests/load/config.${config.tool === 'jmeter' ? 'properties' : 'json'} - Test configuration

3. tests/load/data/users.json - Test user data

4. tests/load/data/payloads.json - Sample request payloads based on tables

5. tests/load/utils/helpers.${config.tool === 'locust' ? 'py' : 'js'} - Helper functions:
   - Authentication handling
   - Dynamic data generation
   - Response validation

6. tests/load/reports/README.md - How to interpret results

7. scripts/run-load-tests.sh - Execution script with different scenarios

For ${config.domain} domain:
- Healthcare: Patient lookup flows, appointment booking, medical record access
- Banking: Balance checks, transaction flows, statement generation
- AMI: Meter reading ingestion, bulk data processing, alert queries

Return ONLY valid JSON:
{
  "files": [
    {"path": "tests/load/main-test.js", "content": "...", "description": "..."}
  ],
  "instructions": "How to run the load tests",
  "expectedMetrics": "Expected baseline metrics for this domain"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating load tests with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a performance testing expert specializing in ${config.tool}. Generate complete, realistic load testing scripts that simulate actual user behavior.
Return ONLY valid JSON. No markdown. Generate REAL test scripts with proper metrics and assertions.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface APIDocsConfig {
  domain: string;
  projectName: string;
  version: string;
  baseUrl: string;
  description: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    operations?: ('list' | 'get' | 'create' | 'update' | 'delete')[];
  }>;
  authentication: 'jwt' | 'oauth2' | 'api-key' | 'none';
  customEndpoints?: Array<{
    method: string;
    path: string;
    summary: string;
    description: string;
    requestBody?: Record<string, any>;
    responseExample?: Record<string, any>;
  }>;
}

export interface GeneratedAPIDocs {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
}

export async function groqGenerateAPIDocs(config: APIDocsConfig): Promise<GeneratedAPIDocs> {
  const client = getClient();

  const tablesList = config.tables?.map(t => {
    const cols = t.columns.map(c => 
      `    - ${c.name} (${c.type})${c.required ? ' REQUIRED' : ''}${c.description ? `: ${c.description}` : ''}`
    ).join('\n');
    const ops = t.operations?.join(', ') || 'list, get, create, update, delete';
    return `- ${t.name} [${ops}]:\n${cols}`;
  }).join('\n\n') || '';

  const customEndpointsList = config.customEndpoints?.map(e => 
    `- ${e.method.toUpperCase()} ${e.path}: ${e.summary}`
  ).join('\n') || 'None';

  const prompt = `Generate complete OpenAPI 3.0 specification for a ${config.domain.toUpperCase()} API.

Project: ${config.projectName}
API Version: ${config.version}
Base URL: ${config.baseUrl}
Description: ${config.description}
Authentication: ${config.authentication}

ENTITIES (generate CRUD endpoints for each):
${tablesList}

CUSTOM ENDPOINTS:
${customEndpointsList}

Generate COMPLETE API documentation:

1. docs/openapi.yaml - Full OpenAPI 3.0 specification with:
   - Complete info section with contact, license, terms
   - Server definitions (dev, staging, production)
   - Security schemes (${config.authentication})
   - All CRUD endpoints for each entity
   - Detailed request/response schemas
   - Pagination, filtering, sorting parameters
   - Error responses (400, 401, 403, 404, 500)
   - Examples for all operations
   - Tags for grouping

2. docs/openapi.json - JSON version of the spec

3. docs/README.md - API documentation guide with:
   - Authentication setup
   - Rate limiting info
   - Pagination patterns
   - Error handling guide

4. docs/examples/curl.md - cURL examples for all endpoints

5. docs/examples/javascript.md - JavaScript/fetch examples

6. docs/examples/python.md - Python requests examples

For ${config.domain} domain, include domain-specific endpoints:
- Healthcare: /patients, /appointments, /providers, /prescriptions, /records with HIPAA considerations
- Banking: /accounts, /transactions, /statements, /transfers with PCI-DSS response formatting
- AMI: /meters, /readings, /alerts, /consumption with time-series query parameters

Return ONLY valid JSON:
{
  "files": [
    {"path": "docs/openapi.yaml", "content": "...", "description": "..."}
  ],
  "instructions": "How to use and host the documentation"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating API documentation with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an API documentation expert. Generate complete, comprehensive OpenAPI 3.0 specifications with detailed schemas, examples, and industry-standard documentation.
Return ONLY valid JSON. No markdown wrapper. Generate REAL OpenAPI specs with complete schemas.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 16000
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

export interface SecurityConfig {
  domain: string;
  projectName: string;
  compliance: string[];
  deploymentType: 'cloud' | 'on-premises' | 'hybrid';
  cloudProvider?: string;
  database: string;
  authentication: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedSecurity {
  report: {
    score: number;
    grade: string;
    issues: Array<{
      severity: string;
      category: string;
      title: string;
      description: string;
      recommendation: string;
      cwe?: string;
      owasp?: string;
    }>;
    recommendations: string[];
  };
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
}

export async function groqGenerateSecurity(config: SecurityConfig): Promise<GeneratedSecurity> {
  const client = getClient();

  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || '';
  const complianceList = config.compliance?.join(', ') || 'General security best practices';

  const prompt = `Generate a comprehensive security analysis and security configuration for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Compliance Requirements: ${complianceList}
Deployment Type: ${config.deploymentType}
Cloud Provider: ${config.cloudProvider || 'N/A'}
Database: ${config.database}
Authentication: ${config.authentication}
Data Classification: ${config.dataClassification || 'confidential'}

DATABASE TABLES (analyze for sensitive data):
${tablesList}

Generate COMPLETE security analysis with:
1. Security Report: score (0-100), grade (A-F), issues with severity/category/title/description/recommendation/CWE/OWASP
2. Security config files: helmet-config.ts, rate-limiter.ts, cors-config.ts, input-validation.ts, encryption.ts, audit-logger.ts

Return ONLY valid JSON:
{
  "report": {"score": 75, "grade": "B", "issues": [...], "recommendations": [...]},
  "files": [{"path": "security/helmet-config.ts", "content": "...", "description": "..."}],
  "instructions": "How to implement"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating security analysis with Groq AI...");
    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a cybersecurity expert. Generate comprehensive security analyses and production-ready security configurations. Return ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface CostOptimizationConfig {
  domain: string;
  projectName: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  tier: string;
  currentCost: number;
  appServers: number;
  dbReplicas: number;
  cacheNodes: number;
  storageGB: number;
  monthlyEgressGB: number;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedCostOptimization {
  report: {
    currentMonthlyCost: number;
    optimizedMonthlyCost: number;
    totalSavings: number;
    savingsPercentage: number;
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      estimatedSavings: number;
      effort: string;
      impact: string;
      implementation: string[];
    }>;
    quickWins: string[];
    longTermOptimizations: string[];
  };
  files: Array<{ path: string; content: string; description: string }>;
  instructions: string;
}

export async function groqGenerateCostOptimization(config: CostOptimizationConfig): Promise<GeneratedCostOptimization> {
  const client = getClient();

  const prompt = `Generate cost optimization analysis for ${config.domain.toUpperCase()} on ${config.cloudProvider.toUpperCase()}.
Current: $${config.currentCost}/month, ${config.appServers} servers, ${config.dbReplicas} DB replicas, ${config.storageGB}GB storage.

Generate recommendations with category, title, savings estimate, effort level, and implementation steps.
Return ONLY valid JSON with report (currentMonthlyCost, optimizedMonthlyCost, totalSavings, recommendations, quickWins, longTermOptimizations) and files.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating cost optimization with Groq AI...");
    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: `You are a ${config.cloudProvider} cost optimization expert. Generate actionable cost reduction recommendations. Return ONLY valid JSON.` },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 12000
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

export interface DocumentationConfig {
  domain: string;
  projectName: string;
  modules: Array<{ name: string; description: string }>;
  screens: Array<{ name: string; type: string; description?: string }>;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
  techStack?: { frontend?: string; backend?: string; database?: string; cloud?: string };
}

export interface GeneratedDocumentation {
  files: Array<{ path: string; content: string; description: string }>;
  instructions: string;
}

export async function groqGenerateDocumentation(config: DocumentationConfig): Promise<GeneratedDocumentation> {
  const client = getClient();

  const modulesList = config.modules?.map(m => `- ${m.name}: ${m.description}`).join('\n') || '';
  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || '';

  const prompt = `Generate comprehensive documentation for ${config.domain.toUpperCase()} project "${config.projectName}".
Modules: ${modulesList}
Tables: ${tablesList}
Tech: ${config.techStack?.frontend || 'React'}, ${config.techStack?.backend || 'Node.js'}, ${config.techStack?.database || 'PostgreSQL'}

Generate: README.md, ARCHITECTURE.md, INSTALLATION.md, API.md, USER_GUIDE.md, DEPLOYMENT.md
Return ONLY valid JSON with files array.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating documentation with Groq AI...");
    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a technical writing expert. Generate comprehensive project documentation. Return ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 16000
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

export interface DomainModuleConfig {
  domain: string;
  existingModules?: string[];
}

export interface RecommendedModule {
  name: string;
  description: string;
  priority: 'core' | 'recommended' | 'optional';
  entities: Array<{ name: string; description: string }>;
  screens: Array<{ name: string; type: string; description: string }>;
  apis: string[];
  dependencies: string[];
  compliance?: string[];
}

export interface DomainModulesRecommendation {
  domain: string;
  overview: string;
  modules: RecommendedModule[];
  suggestedOrder: string[];
  integrations: string[];
}

export async function groqRecommendDomainModules(config: DomainModuleConfig): Promise<DomainModulesRecommendation> {
  const client = getClient();

  const prompt = `You are an enterprise software architect. For the ${config.domain.toUpperCase()} domain, recommend all the modules needed for a complete application.

${config.existingModules?.length ? `Already implemented modules: ${config.existingModules.join(', ')}` : 'Starting fresh - no modules yet.'}

For each module provide:
1. Name and description
2. Priority: core (must-have), recommended (important), optional (nice-to-have)
3. Entities/tables it needs
4. Screens it needs (list, form, detail, dashboard, chart, etc.)
5. APIs it exposes
6. Dependencies on other modules
7. Any compliance requirements (HIPAA, PCI-DSS, GDPR, etc.)

Also provide:
- Suggested implementation order (build dependencies first)
- External integrations needed (payment, email, SMS, etc.)

Return ONLY valid JSON:
{
  "domain": "${config.domain}",
  "overview": "Brief description of the domain",
  "modules": [
    {
      "name": "Module Name",
      "description": "What this module does",
      "priority": "core",
      "entities": [{"name": "EntityName", "description": "..."}],
      "screens": [{"name": "ScreenName", "type": "list", "description": "..."}],
      "apis": ["GET /api/entity", "POST /api/entity"],
      "dependencies": [],
      "compliance": ["HIPAA"]
    }
  ],
  "suggestedOrder": ["Module1", "Module2", "Module3"],
  "integrations": ["Stripe", "SendGrid", "Twilio"]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Recommending domain modules with Groq AI...");
    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are an enterprise software architect with deep domain expertise. Return ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
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

export interface SingleModuleConfig {
  domain: string;
  moduleName: string;
  moduleDescription?: string;
  database: string;
  framework: string;
  existingTables?: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
}

export interface GeneratedModule {
  module: {
    name: string;
    description: string;
  };
  entities: Array<{
    name: string;
    tableName: string;
    columns: Array<{ name: string; type: string; nullable: boolean; references?: string }>;
  }>;
  screens: Array<{
    name: string;
    type: string;
    code: string;
  }>;
  apis: Array<{
    method: string;
    path: string;
    description: string;
    code: string;
  }>;
  migration: string;
  tests: string;
  instructions: string;
}

export async function groqGenerateSingleModule(config: SingleModuleConfig): Promise<GeneratedModule> {
  const client = getClient();

  const existingTablesInfo = config.existingTables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || 'None';

  const prompt = `Generate a COMPLETE module for the ${config.domain.toUpperCase()} domain.

Module: ${config.moduleName}
${config.moduleDescription ? `Description: ${config.moduleDescription}` : ''}
Database: ${config.database}
Framework: ${config.framework}

EXISTING TABLES (can reference for foreign keys):
${existingTablesInfo}

Generate EVERYTHING needed for this module:

1. ENTITIES - Full table schemas with:
   - All columns with proper types
   - Foreign key relationships
   - Indexes for performance

2. SCREENS - React components for:
   - List view with search/filter/pagination
   - Form for create/edit
   - Detail view
   - Any dashboards or charts if applicable

3. APIs - Express endpoints for:
   - CRUD operations
   - Search/filter
   - Any business logic endpoints

4. MIGRATION - SQL migration file

5. TESTS - Basic test cases

Return ONLY valid JSON with all code.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    console.log(`Generating module ${config.moduleName} with Groq AI...`);
    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a full-stack developer. Generate complete, production-ready code for each module component. Return ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 16000
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
