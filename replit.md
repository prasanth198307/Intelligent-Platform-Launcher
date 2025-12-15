# Intelligent Platform Launcher (IPL)

## Overview
The Intelligent Platform Launcher (IPL) is designed to streamline the application design and deployment process across various domains and database types. It automates critical decisions by analyzing user requirements to provide comprehensive recommendations. IPL aims to simplify complex technical choices, offering users a powerful tool for efficient and cost-effective application development and deployment.

Key capabilities include:
- Infrastructure and architecture recommendations.
- Multi-cloud cost estimations (AWS, Azure, GCP).
- Security and compliance analysis (HIPAA, GDPR, PCI-DSS, SOC2, DPDP).
- Flexible deployment options (Cloud, On-Premises, Hybrid).
- Mobile application generation (iOS, Android, PWA).
- AI-driven code generation for modules, screens, database schemas, and test cases.

## User Preferences
- **Communication Style**: I prefer clear, concise, and simple language.
- **Workflow**: I want iterative development.
- **Interaction**: Ask before making major changes.
- **Explanations**: I prefer detailed explanations.
- **Code Changes**: Do not make changes to files in the `domain-packs/` folder.

## System Architecture
The IPL platform is structured as a monorepo containing several microservices and a UI console.

**Project Structure:**
```
ipl-platform/
├── apps/
│   ├── ui-console/          # React frontend (Vite) - Port 5000
│   ├── ai-generator-service/ # AI/LLM service - Port 8080
│   ├── rule-engine-service/  # Business rules engine
│   ├── workflow-engine-service/ # Workflow orchestration
│   └── connector-service/    # Integration gateway
├── domain-packs/             # Industry-specific templates
└── package.json              # Root monorepo config
```

**UI/UX Decisions:**
- Frontend developed with React 19, Vite 7, and TypeScript.
- Styling uses CSS with custom properties.
- Interactive Entity-Relationship Diagrams (ERD) for database schema visualization are implemented using React Flow.
- A project setup wizard guides users through five phases (Discovery, Design, Build, Deploy, Operate) with task checklists.
- **Results Panel Organization**: The analysis results are organized into 6 categories with a sticky sidebar navigation:
  - **Overview**: Infrastructure Specs, Hardware Recommendations, Cost Comparison, Security Requirements, Deployment Options, Export
  - **Architecture**: Architecture Diagram, Entity Relationship Diagram, Cluster Configuration
  - **Build & Code**: AI Code Assistant, DevOps Panel, Backend API Generation
  - **Testing**: Benchmarking, API Testing, AI Automation, Testing & Quality
  - **Operations**: Monitoring, Environment Manager, Data Connectivity
  - **Integrations**: Integrations & APIs, Development Tools
- Collapsible sections allow users to expand/collapse individual panels within each category.
- A highlights summary card displays key metrics (Tier, Est. Cost, Cloud Provider, Deployment Type) at the top of the results.

**Technical Implementations & Feature Specifications:**
- **Domain Agnostic**: Supports 26+ industry domains (e.g., AMI, Banking, Healthcare, Manufacturing) and industry-specific compliance standards.
- **Database Agnostic**: Compatible with various databases including PostgreSQL, MySQL, MongoDB, Oracle, and Cassandra.
- **Infrastructure Auto-Selector**: Calculates infrastructure needs based on device/meter count, transactions, and scale tier (Small, Medium, Large, Massive).
- **Multi-Cloud Support**: Provides cost comparison across AWS, Azure, and Google Cloud.
- **Deployment Flexibility**: Offers one-click cloud deployment, Docker Compose/Helm Charts for on-premises, and hybrid options.
- **Mobile App Generation**: Generates iOS, Android, and PWA apps with features like offline sync, push notifications, and biometric authentication. Uses React Native/Expo for full project generation.
- **AI Code Generation**: The `ai-generator-service` (LLM-ready) generates application modules, UI screens (list, form, detail, chart, map), database schemas (tables, columns, relationships), and comprehensive test cases (unit, integration, E2E, security).
- **Workspace Management**: Allows users to save, load, and delete project configurations, persisting data in a PostgreSQL database.
- **DevOps & Automation Panel**: Unified panel with generators for Infrastructure as Code (Terraform, CloudFormation, Docker), CI/CD Pipelines (GitHub Actions, GitLab CI, Jenkins), API Documentation (OpenAPI), Database Migrations, Authentication Templates (JWT, OAuth), Load Testing (k6, JMeter), Security Scanning, and Cost Optimization.
- **App Benchmarking**: Executes live performance tests against API endpoints, providing metrics (response times, latency percentiles, throughput), performance grading, and AI-powered optimization recommendations.
- **Backend API Code Generation**: Generates complete server-side API projects for Node.js/Express (TypeScript), Python/FastAPI, and Go/Gin, including CRUD endpoints, authentication, database connection, and Docker support.
- **API Testing Interface**: A built-in HTTP client similar to Postman for testing APIs with support for various methods, headers, and body editing.
- **Live Code Editor**: A syntax-highlighted editor for viewing generated code, with file browsing, editing, and download capabilities.
- **AI Automation Panel**: Advanced AI tools for Natural Language to Code, Security Vulnerability Scanning, and AI Debugging Assistance.
- **Integrations & APIs Panel**: Configuration for webhooks, GraphQL schema generation from database, and message queue setup (RabbitMQ, Kafka).
- **Development Tools Panel**: Includes Git integration, a visual SQL query builder, and API endpoint discovery.
- **Testing & Quality Panel**: Features a test runner, code coverage analysis, accessibility checker, and SEO analyzer.
- **Data Connectivity Panel**: Provides a database connection wizard, schema discovery, data pipeline creation, and data import functionalities.
- **Monitoring & Observability Panel**: Real-time metrics dashboards, log viewer, alert configuration, and health checks.
- **Environment Manager Panel**: Manages multiple environments (dev, staging, production) with variable management and promotion workflows.
- **Cross-Domain Features**: Includes CI/CD Pipeline integration, API Gateway configurations, Monitoring & Observability setups, Backup & Disaster Recovery strategies, Notification & Alert systems, Documentation Generation, Performance SLAs, Data Migration Strategies, and Version Control Workflow guidance.
- **Specification Features**: Multi-tenant configurations, multi-lingual support, payment and 3rd party integration detection, and source code scaffolding previews.

## External Dependencies
- **AI/LLM**: OpenAI (configurable, with fallback to mock data if `OPENAI_API_KEY` is not set). Uses `gpt-4o-mini` by default.
- **Databases**: PostgreSQL (for workspace persistence), and support for integration with PostgreSQL, MySQL, SQL Server, Oracle, MongoDB, TimescaleDB, Cassandra, DynamoDB.
- **Cloud Providers**: AWS, Azure, Google Cloud (for cost estimation and deployment).
- **Frontend Framework**: React, Vite, TypeScript.
- **Backend Framework**: Express.js.
- **Version Control**: Git (integration for branch management, commit history).
- **CI/CD Tools**: GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI.
- **Infrastructure as Code**: Terraform, CloudFormation, Docker, Kubernetes, Helm.
- **Load Testing**: k6, JMeter.
- **ORM**: Drizzle ORM (for database migrations), SQLAlchemy (FastAPI), GORM (Go/Gin).
- **Auth**: JWT, OAuth (Google/GitHub).
- **Messaging Queues**: RabbitMQ, Kafka, Redis Pub/Sub, AWS SQS.
- **API Gateways**: Kong, AWS API Gateway, Azure APIM, Nginx, Envoy.
- **Monitoring**: Prometheus, Grafana, ELK, Datadog, New Relic, CloudWatch.
- **Payment & Third-party Integrations**: Stripe, Plaid, Twilio (detected per domain).