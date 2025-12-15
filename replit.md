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

## Project Structure

```
ipl-platform/
├── apps/
│   ├── ui-console/          # React frontend (Vite) - Port 5000
│   ├── ai-generator-service/ # AI/LLM service - Port 7100
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
Supports multiple industries: AMI, Banking, Insurance, Healthcare, Manufacturing, Retail, Custom

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

## Running Locally

```bash
cd ipl-platform/apps/ui-console
npm install
npm run dev
```

The UI runs on port 5000.

## Technical Stack
- Frontend: React 19 + Vite 7 + TypeScript
- Styling: CSS with custom properties
- Backend: Express.js with OpenAI integration (planned)

## Recent Changes
- December 15, 2025: Enhanced cost breakdown UI to display all components (Compute, Database, Cache, Queue, Storage, Network) with pricing assumptions note
- December 15, 2025: Initial implementation of Intelligent Platform Launcher with full UI
