# Intelligent Platform Launcher (IPL)

## Overview
An intelligent platform launcher that helps users design and deploy applications regardless of domain or database type. The platform analyzes requirements and provides:

- Infrastructure recommendations (compute, storage, network)
- Architecture diagrams showing system topology
- Cost estimates for AWS, Azure, and GCP
- Security and compliance analysis (HIPAA, GDPR, PCI-DSS, SOC2, DPDP)
- Deployment options (Cloud, On-Premises, Hybrid)
- App and database clustering configurations
- Mobile app generation (iOS, Android, PWA)
- AI-generated code specifications (Modules, Screens, DB Schema, Tests)

## Project Structure

```
ipl-platform/
├── apps/
│   ├── ui-console/          # React frontend (Vite) - Port 5000
│   ├── ai-generator-service/ # AI/LLM service - Port 8080
│   ├── rule-engine-service/  # Business rules engine
│   ├── workflow-engine-service/ # Workflow orchestration
│   └── connector-service/    # Integration gateway
├── domain-packs/             # Industry-specific templates
│   ├── ami/                  # AMI/Smart Metering
│   ├── banking/              # Banking & Finance
│   ├── healthcare/           # Healthcare
│   ├── insurance/            # Insurance
│   └── manufacturing/        # Manufacturing
└── package.json              # Root monorepo config
```

## Key Features

### 1. Domain Agnostic
Supports multiple industries: AMI, CIS, CRM, IVRS, Contact Center, Banking, Insurance, Healthcare, Manufacturing, Retail, Custom

### 2. Database Agnostic
Works with: PostgreSQL, MySQL, SQL Server, Oracle, MongoDB, TimescaleDB, Cassandra, DynamoDB

### 3. Infrastructure Auto-Selector
Calculates infrastructure needs based on:
- Device/meter count
- Transactions per day
- Scale tier (Small, Medium, Large, Massive)

### 4. Multi-Cloud Support
Cost comparison across AWS, Azure, and Google Cloud

### 5. Deployment Flexibility
- Cloud: One-click deployment with auto-provisioning
- On-Premises: Docker Compose, Helm Charts, VM Images, Ansible
- Hybrid: Cloud management with on-prem data storage

### 6. Mobile App Generation
Generates iOS, Android, or PWA apps with:
- Offline sync
- Push notifications
- Biometric auth
- Real-time updates

### 7. AI Code Generation (LLM-Ready)
The platform includes an AI generator service that can generate:
- **Modules**: Domain-specific application modules with priorities
- **Screens**: UI screens with types (list, form, detail, chart, map)
- **Database Schema**: Tables with columns, types, and relationships
- **Test Cases**: Unit, integration, E2E, and security tests

When OPENAI_API_KEY is set, uses OpenAI for generation. Otherwise, uses realistic mock data.

## Running Locally

```bash
# UI Console (Port 5000)
cd ipl-platform/apps/ui-console
npm install
npm run dev

# AI Generator Service (Port 8080)
cd ipl-platform/apps/ai-generator-service
npm install
npm run dev
```

## Environment Variables
- `OPENAI_API_KEY`: OpenAI API key for LLM-powered generation (optional, falls back to mock)
- `LLM_PROVIDER`: Set to "openai" to use OpenAI (default: "mock")
- `OPENAI_MODEL`: OpenAI model to use (default: "gpt-4o-mini")

## Technical Stack
- Frontend: React 19 + Vite 7 + TypeScript
- Styling: CSS with custom properties
- Backend: Express.js with OpenAI integration
- AI: OpenAI GPT-4o-mini (configurable)

## Recent Changes
- December 15, 2025: Added 10 cross-domain features:
  - CI/CD Pipeline (GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI)
  - API Gateway (Kong, AWS API Gateway, Azure APIM, Nginx, Envoy)
  - Monitoring & Observability (Prometheus+Grafana, ELK, Datadog, New Relic, CloudWatch)
  - Backup & Disaster Recovery (Hot/Warm/Cold standby, Pilot Light)
  - Environment Management (Dev, Staging, UAT, Prod, DR)
  - Notifications & Alerts (Email, SMS, Push, Slack, Teams, Webhook)
  - Documentation Generation (API docs, User Guide, Admin Guide, Developer, Runbook)
  - Performance SLAs (P99 latency, Uptime targets)
  - Data Migration Strategy (Big-bang, Phased, Parallel-run, Strangler)
  - Version Control Workflow (GitFlow, GitHub Flow, Trunk-based, Feature Branch)
- December 15, 2025: Added comprehensive specification features:
  - Multi-tenant configuration options (UI only vs UI+DB with schema/row-level isolation)
  - Multi-lingual support with 10 language options and level selection
  - Payment and 3rd party integration detection per domain (Stripe, Plaid, Twilio, etc.)
  - Source code scaffolding structure preview (folder tree and key files)
  - Configuration options display in generated artifacts
- December 15, 2025: Added AI Code Generation feature with LLM-ready backend service (port 8080), generates Modules, Screens, DB Schema, and Test Cases
- December 15, 2025: Added new domains (CIS, CRM, IVRS, Contact Center), dynamic field labels, domain-specific standards, and deployment type selector in input panel
- December 15, 2025: Enhanced cost breakdown UI to display all components (Compute, Database, Cache, Queue, Storage, Network) with pricing assumptions note
- December 15, 2025: Initial implementation of Intelligent Platform Launcher with full UI
