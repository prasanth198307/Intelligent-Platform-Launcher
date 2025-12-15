export interface DocumentationContext {
  domain: string;
  projectName?: string;
  requirements?: string;
  infrastructure?: {
    tier: string;
    devices: string;
    dailyRecords: string;
  };
  techStack?: {
    primaryDb: { name: string; description: string };
    backend: { name: string; description: string };
    frontend: { name: string; description: string };
    cache?: { name: string; description: string };
    queue?: { name: string; description: string };
    documentProcessing?: { name: string; description: string };
  };
  tables?: Array<{
    name: string;
    columns: Array<{ name: string; type: string; description?: string }>;
  }>;
  security?: Array<{ category: string; requirements: string[] }>;
  deploymentType?: 'cloud' | 'onprem' | 'hybrid';
  cloudProvider?: string;
  compliance?: string[];
}

function analyzeRequirements(requirements: string = '', domain: string, tier: string = 'Medium'): {
  suggestedDb: string;
  suggestedBackend: string;
  suggestedFeatures: string[];
  suggestedIntegrations: string[];
} {
  const reqLower = requirements.toLowerCase();
  
  let suggestedDb = 'PostgreSQL';
  let suggestedBackend = 'Node.js with Express';
  const suggestedFeatures: string[] = [];
  const suggestedIntegrations: string[] = [];

  if (reqLower.includes('time-series') || reqLower.includes('sensor') || reqLower.includes('iot') || reqLower.includes('meter')) {
    suggestedDb = 'TimescaleDB';
    suggestedFeatures.push('Time-series data compression', 'Continuous aggregates');
  } else if (reqLower.includes('document') || reqLower.includes('flexible schema') || reqLower.includes('unstructured')) {
    suggestedDb = 'MongoDB';
    suggestedFeatures.push('Flexible document schemas', 'Horizontal scaling');
  } else if (reqLower.includes('graph') || reqLower.includes('relationship') || reqLower.includes('connected')) {
    suggestedDb = 'Neo4j or PostgreSQL with GraphQL';
    suggestedFeatures.push('Graph traversal queries', 'Relationship-first data model');
  } else if (tier === 'Massive' || reqLower.includes('distributed') || reqLower.includes('global')) {
    suggestedDb = 'CockroachDB or Cassandra';
    suggestedFeatures.push('Geo-distributed data', 'Multi-region replication');
  }

  if (reqLower.includes('machine learning') || reqLower.includes('ml') || reqLower.includes('ai')) {
    suggestedBackend = 'Python with FastAPI';
    suggestedFeatures.push('ML model serving', 'Data science workflows');
  } else if (reqLower.includes('high performance') || reqLower.includes('low latency') || reqLower.includes('real-time')) {
    suggestedBackend = 'Go with Gin';
    suggestedFeatures.push('Ultra-low latency APIs', 'High concurrency handling');
  } else if (tier === 'Large' || tier === 'Massive') {
    suggestedBackend = 'Node.js with NestJS or Java with Spring Boot';
    suggestedFeatures.push('Enterprise patterns', 'Microservices architecture');
  }

  if (reqLower.includes('payment') || reqLower.includes('billing') || reqLower.includes('transaction')) {
    suggestedIntegrations.push('Stripe or PayPal for payments');
    suggestedFeatures.push('PCI-DSS compliance', 'Transaction audit logging');
  }
  if (reqLower.includes('email') || reqLower.includes('notification') || reqLower.includes('alert')) {
    suggestedIntegrations.push('SendGrid or SES for emails');
    suggestedFeatures.push('Multi-channel notifications');
  }
  if (reqLower.includes('sms') || reqLower.includes('phone') || reqLower.includes('otp')) {
    suggestedIntegrations.push('Twilio for SMS/Voice');
  }
  if (reqLower.includes('pdf') || reqLower.includes('document') || reqLower.includes('ocr') || reqLower.includes('scan')) {
    suggestedIntegrations.push('Document processing with OCR');
    suggestedFeatures.push('PDF generation and parsing', 'Intelligent data extraction');
  }
  if (reqLower.includes('search') || reqLower.includes('full-text') || reqLower.includes('elasticsearch')) {
    suggestedIntegrations.push('Elasticsearch or Meilisearch');
    suggestedFeatures.push('Full-text search', 'Fuzzy matching');
  }
  if (reqLower.includes('cache') || reqLower.includes('fast') || reqLower.includes('session')) {
    suggestedIntegrations.push('Redis for caching');
  }
  if (reqLower.includes('queue') || reqLower.includes('async') || reqLower.includes('background')) {
    suggestedIntegrations.push('RabbitMQ or Redis for job queues');
    suggestedFeatures.push('Async task processing', 'Retry mechanisms');
  }
  if (reqLower.includes('file') || reqLower.includes('upload') || reqLower.includes('storage') || reqLower.includes('media')) {
    suggestedIntegrations.push('S3 or cloud object storage');
    suggestedFeatures.push('File upload handling', 'CDN integration');
  }

  if (domain === 'healthcare') {
    suggestedFeatures.push('HIPAA-compliant data handling', 'HL7/FHIR integration');
  } else if (domain === 'banking' || domain === 'insurance') {
    suggestedFeatures.push('Financial-grade security', 'Audit trail logging');
  } else if (domain === 'ami') {
    suggestedFeatures.push('DLMS/COSEM protocol support', 'High-frequency data ingestion');
  }

  return { suggestedDb, suggestedBackend, suggestedFeatures, suggestedIntegrations };
}

export interface GeneratedDocumentation {
  files: Array<{
    name: string;
    content: string;
    type: 'readme' | 'architecture' | 'installation' | 'user-guide' | 'api-reference';
  }>;
}

function toTitleCase(str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function generateProjectDocumentation(ctx: DocumentationContext): GeneratedDocumentation {
  const projectName = ctx.projectName || `${toTitleCase(ctx.domain)} Platform`;
  const files: GeneratedDocumentation['files'] = [];

  files.push({
    name: 'README.md',
    type: 'readme',
    content: generateReadme(ctx, projectName)
  });

  files.push({
    name: 'ARCHITECTURE.md',
    type: 'architecture',
    content: generateArchitectureDoc(ctx, projectName)
  });

  files.push({
    name: 'INSTALLATION.md',
    type: 'installation',
    content: generateInstallationGuide(ctx, projectName)
  });

  files.push({
    name: 'USER_GUIDE.md',
    type: 'user-guide',
    content: generateUserGuide(ctx, projectName)
  });

  files.push({
    name: 'API_REFERENCE.md',
    type: 'api-reference',
    content: generateApiReference(ctx, projectName)
  });

  return { files };
}

function generateReadme(ctx: DocumentationContext, projectName: string): string {
  const tier = ctx.infrastructure?.tier || 'Medium';
  const db = ctx.techStack?.primaryDb?.name || 'PostgreSQL';
  const backend = ctx.techStack?.backend?.name || 'Node.js';
  const frontend = ctx.techStack?.frontend?.name || 'React';
  
  return `# ${projectName}

## Overview

${ctx.requirements || `A comprehensive ${toTitleCase(ctx.domain)} management platform designed for enterprise-scale operations.`}

## Key Features

- **Scalable Architecture**: ${tier} tier infrastructure supporting ${ctx.infrastructure?.devices || '100K'} entities
- **High Throughput**: Processing ${ctx.infrastructure?.dailyRecords || '10M'} records daily
- **Modern Tech Stack**: Built with ${backend} and ${frontend}
- **Enterprise Security**: ${ctx.compliance?.length ? ctx.compliance.join(', ') + ' compliant' : 'Industry-standard security'}
${ctx.techStack?.documentProcessing ? `- **Document Processing**: ${ctx.techStack.documentProcessing.name} for OCR and data extraction` : ''}

## Technology Stack

| Component | Technology |
|-----------|------------|
| Database | ${db} |
| Backend | ${backend} |
| Frontend | ${frontend} |
${ctx.techStack?.cache ? `| Cache | ${ctx.techStack.cache.name} |` : ''}
${ctx.techStack?.queue ? `| Message Queue | ${ctx.techStack.queue.name} |` : ''}
${ctx.techStack?.documentProcessing ? `| Document Processing | ${ctx.techStack.documentProcessing.name} |` : ''}

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/${projectName.toLowerCase().replace(/\s+/g, '-')}.git

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
\`\`\`

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Installation Guide](./docs/INSTALLATION.md)
- [User Guide](./docs/USER_GUIDE.md)
- [API Reference](./docs/API_REFERENCE.md)

## Deployment

This project supports multiple deployment options:
${ctx.deploymentType === 'cloud' ? `- **Cloud Deployment**: Optimized for ${ctx.cloudProvider?.toUpperCase() || 'AWS/Azure/GCP'}` : ''}
${ctx.deploymentType === 'onprem' ? '- **On-Premises**: Docker Compose and VM images available' : ''}
${ctx.deploymentType === 'hybrid' ? '- **Hybrid**: Cloud with on-prem edge nodes' : ''}

## License

Copyright © ${new Date().getFullYear()} Your Organization. All rights reserved.
`;
}

function generateArchitectureDoc(ctx: DocumentationContext, projectName: string): string {
  const tier = ctx.infrastructure?.tier || 'Medium';
  const db = ctx.techStack?.primaryDb?.name || 'PostgreSQL';
  const backend = ctx.techStack?.backend?.name || 'Node.js';
  
  return `# ${projectName} - Architecture Documentation

## System Overview

This document describes the architecture of the ${projectName} system, a ${tier}-tier ${toTitleCase(ctx.domain)} platform.

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  App      │   │  App      │   │  App      │
        │  Server   │   │  Server   │   │  Server   │
        │  (${backend.split(' ')[0]})│   │  (${backend.split(' ')[0]})│   │  (${backend.split(' ')[0]})│
        └───────────┘   └───────────┘   └───────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  Cache    │   │  Database │   │  Queue    │
        │  ${(ctx.techStack?.cache?.name || 'Redis').split(' ')[0]}  │   │  ${db.split(' ')[0]}  │   │  ${(ctx.techStack?.queue?.name || 'RabbitMQ').split(' ')[0]}  │
        └───────────┘   └───────────┘   └───────────┘
\`\`\`

## Components

### 1. Frontend Layer
- **Technology**: ${ctx.techStack?.frontend?.name || 'React'}
- **Description**: ${ctx.techStack?.frontend?.description || 'Modern responsive web application'}
- **Features**: Real-time updates, offline support, responsive design

### 2. Backend Layer
- **Technology**: ${backend}
- **Description**: ${ctx.techStack?.backend?.description || 'RESTful API services'}
- **Features**: Authentication, authorization, business logic, data validation

### 3. Data Layer
- **Primary Database**: ${db}
  - ${ctx.techStack?.primaryDb?.description || 'Primary data store for all application data'}
${ctx.techStack?.cache ? `- **Cache**: ${ctx.techStack.cache.name}
  - ${ctx.techStack.cache.description}` : ''}
${ctx.techStack?.queue ? `- **Message Queue**: ${ctx.techStack.queue.name}
  - ${ctx.techStack.queue.description}` : ''}

${ctx.techStack?.documentProcessing ? `### 4. Document Processing Layer
- **Technology**: ${ctx.techStack.documentProcessing.name}
- **Description**: ${ctx.techStack.documentProcessing.description}
- **Capabilities**:
  - PDF text extraction and parsing
  - Image OCR (Optical Character Recognition)
  - Document classification
  - Data field extraction with confidence scoring
  - Medical/Healthcare NLP (if applicable)` : ''}

## Data Flow

1. **User Request** → Load Balancer → Application Server
2. **Application Server** → Validates request → Checks cache
3. **Cache Miss** → Query database → Update cache → Return response
4. **Async Operations** → Published to message queue → Processed by workers
${ctx.techStack?.documentProcessing ? `5. **Document Upload** → OCR Processing → Data Extraction → Database Storage` : ''}

## Security Architecture

${ctx.security?.map(s => `### ${s.category}
${s.requirements.map(r => `- ${r}`).join('\n')}`).join('\n\n') || `### Authentication
- JWT-based authentication
- Session management
- Password hashing with bcrypt

### Authorization
- Role-based access control (RBAC)
- API rate limiting
- Input validation`}

## Scalability

- **Horizontal Scaling**: Application servers can be scaled horizontally
- **Database Replication**: Primary-replica setup for read scaling
- **Caching Strategy**: Multi-tier caching to reduce database load
- **Async Processing**: Background jobs for heavy operations

## Monitoring & Observability

- **Metrics**: Response times, error rates, throughput
- **Logging**: Structured logging with correlation IDs
- **Alerting**: Threshold-based alerts for critical metrics
- **Health Checks**: Liveness and readiness probes
`;
}

function generateInstallationGuide(ctx: DocumentationContext, projectName: string): string {
  const db = ctx.techStack?.primaryDb?.name || 'PostgreSQL';
  const backend = ctx.techStack?.backend?.name || 'Node.js';
  const isDocker = ctx.deploymentType === 'onprem' || ctx.deploymentType === 'hybrid';
  
  return `# ${projectName} - Installation Guide

## Prerequisites

Before installing ${projectName}, ensure you have the following:

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: 4+ cores recommended

### Software Requirements
${backend.includes('Node') ? `- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher` : ''}
${backend.includes('Python') ? `- **Python**: v3.10 or higher
- **pip**: Latest version` : ''}
${backend.includes('Go') ? `- **Go**: v1.21 or higher` : ''}
- **${db.split(' ')[0]}**: Latest stable version
${ctx.techStack?.cache ? `- **${ctx.techStack.cache.name.split(' ')[0]}**: Latest stable version` : ''}
- **Docker**: v24.0+ (for containerized deployment)
- **Docker Compose**: v2.20+ (for local development)

## Installation Steps

### Option 1: Local Development Setup

#### Step 1: Clone the Repository
\`\`\`bash
git clone https://github.com/your-org/${projectName.toLowerCase().replace(/\s+/g, '-')}.git
cd ${projectName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

#### Step 2: Install Dependencies
${backend.includes('Node') ? `\`\`\`bash
npm install
\`\`\`` : ''}
${backend.includes('Python') ? `\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`` : ''}
${backend.includes('Go') ? `\`\`\`bash
go mod download
\`\`\`` : ''}

#### Step 3: Configure Environment Variables
\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` with your configuration:
\`\`\`env
# Database Configuration
DATABASE_URL=${db.toLowerCase().includes('postgres') ? 'postgresql://user:password@localhost:5432/dbname' : db.toLowerCase().includes('mysql') ? 'mysql://user:password@localhost:3306/dbname' : 'mongodb://localhost:27017/dbname'}

# Application Settings
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your-secure-secret-key
SESSION_SECRET=your-session-secret

${ctx.techStack?.cache ? `# Cache
REDIS_URL=redis://localhost:6379` : ''}

${ctx.techStack?.documentProcessing ? `# Document Processing / OCR
${ctx.cloudProvider === 'aws' ? 'AWS_ACCESS_KEY_ID=your-access-key\nAWS_SECRET_ACCESS_KEY=your-secret-key\nAWS_REGION=us-east-1' : ctx.cloudProvider === 'azure' ? 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-endpoint\nAZURE_DOCUMENT_INTELLIGENCE_KEY=your-key' : ctx.cloudProvider === 'gcp' ? 'GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json' : 'TESSERACT_PATH=/usr/bin/tesseract'}` : ''}
\`\`\`

#### Step 4: Setup Database
\`\`\`bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
\`\`\`

#### Step 5: Start the Application
\`\`\`bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
\`\`\`

### Option 2: Docker Deployment

#### Step 1: Build and Run with Docker Compose
\`\`\`bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
\`\`\`

#### Docker Compose Configuration
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/${projectName.toLowerCase().replace(/\s+/g, '_')}
    depends_on:
      - db
      - cache
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=${projectName.toLowerCase().replace(/\s+/g, '_')}
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  cache:
    image: redis:7-alpine
    
volumes:
  pgdata:
\`\`\`

## Verification

After installation, verify the setup:

\`\`\`bash
# Check application health
curl http://localhost:3000/health

# Expected response
{"status":"healthy","version":"1.0.0"}
\`\`\`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify database is running
   - Check DATABASE_URL format
   - Ensure firewall allows connections

2. **Port Already in Use**
   - Change PORT in .env
   - Kill process using the port: \`lsof -i :3000\`

3. **Permission Denied**
   - Check file permissions
   - Run with appropriate user privileges

## Next Steps

- [User Guide](./USER_GUIDE.md) - Learn how to use the application
- [API Reference](./API_REFERENCE.md) - Explore the API endpoints
- [Architecture](./ARCHITECTURE.md) - Understand the system design
`;
}

function generateUserGuide(ctx: DocumentationContext, projectName: string): string {
  const domain = toTitleCase(ctx.domain);
  
  return `# ${projectName} - User Guide

## Introduction

Welcome to ${projectName}! This guide will help you get started with the platform and make the most of its features.

## Getting Started

### 1. Accessing the Application

Open your web browser and navigate to:
- **Local**: http://localhost:3000
- **Production**: https://your-domain.com

### 2. First-Time Setup

1. **Create an Account**
   - Click "Sign Up" on the login page
   - Enter your email and create a password
   - Verify your email address

2. **Login**
   - Enter your credentials
   - Enable two-factor authentication (recommended)

3. **Complete Your Profile**
   - Add your organization details
   - Configure notification preferences

## Core Features

### Dashboard

The dashboard provides an overview of your ${domain} operations:
- **Key Metrics**: Real-time statistics and KPIs
- **Recent Activity**: Latest transactions and events
- **Alerts**: Important notifications requiring attention
- **Quick Actions**: Commonly used functions

### Data Management

#### Viewing Records
1. Navigate to the data section
2. Use filters to narrow results
3. Click on a record to view details
4. Export data using the download button

#### Creating Records
1. Click "Add New" button
2. Fill in required fields
3. Upload supporting documents (if applicable)
4. Click "Save" to create the record

#### Editing Records
1. Open the record you want to edit
2. Click "Edit" button
3. Modify the necessary fields
4. Click "Save Changes"

${ctx.techStack?.documentProcessing ? `### Document Processing

The platform includes intelligent document processing capabilities:

#### Uploading Documents
1. Navigate to Documents section
2. Click "Upload Document"
3. Select PDF or image files
4. Wait for OCR processing to complete

#### Viewing Extracted Data
1. Open the processed document
2. Review extracted fields
3. Verify confidence scores
4. Make corrections if needed
5. Approve the extracted data

#### Supported Document Types
- PDF documents
- Scanned images (JPEG, PNG, TIFF)
- Medical records and forms
- Invoices and receipts
- ID documents` : ''}

### Reports & Analytics

#### Generating Reports
1. Go to Reports section
2. Select report type
3. Choose date range and filters
4. Click "Generate"
5. Download or share the report

#### Dashboard Customization
- Drag and drop widgets
- Resize chart components
- Save custom layouts
- Share with team members

### User Management

#### Adding Users (Admin Only)
1. Navigate to Settings → Users
2. Click "Invite User"
3. Enter email and assign role
4. User receives invitation email

#### Roles and Permissions
- **Admin**: Full access to all features
- **Manager**: View and edit data, run reports
- **User**: View data, limited editing
- **Viewer**: Read-only access

## Best Practices

1. **Regular Backups**: Export critical data periodically
2. **Strong Passwords**: Use complex passwords and 2FA
3. **Audit Logs**: Review activity logs regularly
4. **Data Validation**: Verify imported data accuracy

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + N | New record |
| Ctrl + S | Save |
| Ctrl + F | Search |
| Ctrl + E | Export |
| Esc | Close modal |

## Getting Help

- **In-App Help**: Click the ? icon for contextual help
- **Documentation**: Refer to other guides in /docs
- **Support**: Contact support@your-org.com
- **Community**: Join our user community forums

## FAQ

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page and follow the email instructions.

**Q: Can I import data from other systems?**
A: Yes, use the Import feature in Settings. Supported formats: CSV, Excel, JSON.

**Q: How often is data backed up?**
A: Automatic backups occur every 6 hours with 30-day retention.

**Q: Is my data secure?**
A: Yes, all data is encrypted at rest and in transit. ${ctx.compliance?.length ? `We are ${ctx.compliance.join(', ')} compliant.` : ''}
`;
}

function generateApiReference(ctx: DocumentationContext, projectName: string): string {
  const tables = ctx.tables || [];
  
  let endpoints = '';
  
  for (const table of tables) {
    const resource = table.name;
    const resourceTitle = toTitleCase(resource);
    
    endpoints += `
### ${resourceTitle}

#### List ${resourceTitle}
\`\`\`http
GET /api/${resource}
\`\`\`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |
| sort | string | Sort field (e.g., "created_at") |
| order | string | Sort order: "asc" or "desc" |

**Response:**
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
\`\`\`

#### Get ${resourceTitle} by ID
\`\`\`http
GET /api/${resource}/:id
\`\`\`

#### Create ${resourceTitle}
\`\`\`http
POST /api/${resource}
Content-Type: application/json

{
${table.columns.filter(c => !['id', 'created_at', 'updated_at'].includes(c.name)).map(c => `  "${c.name}": <${c.type}>`).join(',\n')}
}
\`\`\`

#### Update ${resourceTitle}
\`\`\`http
PUT /api/${resource}/:id
Content-Type: application/json

{
${table.columns.filter(c => !['id', 'created_at', 'updated_at'].includes(c.name)).map(c => `  "${c.name}": <${c.type}>`).join(',\n')}
}
\`\`\`

#### Delete ${resourceTitle}
\`\`\`http
DELETE /api/${resource}/:id
\`\`\`

---
`;
  }

  return `# ${projectName} - API Reference

## Overview

This document provides a comprehensive reference for the ${projectName} REST API.

**Base URL:** \`https://api.your-domain.com/v1\`

## Authentication

All API requests require authentication using JWT tokens.

### Obtaining a Token
\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "refreshToken": "dGhpcyBpcyBh..."
}
\`\`\`

### Using the Token
Include the token in the Authorization header:
\`\`\`http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

### Refreshing Tokens
\`\`\`http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBh..."
}
\`\`\`

## Response Format

All responses follow a consistent format:

### Success Response
\`\`\`json
{
  "ok": true,
  "data": { ... },
  "message": "Operation successful"
}
\`\`\`

### Error Response
\`\`\`json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...]
  }
}
\`\`\`

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate limited:
- **Standard**: 100 requests per minute
- **Authenticated**: 1000 requests per minute

Rate limit headers are included in responses:
\`\`\`
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
\`\`\`

## Endpoints

${endpoints || `### Health Check
\`\`\`http
GET /api/health
\`\`\`

**Response:**
\`\`\`json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
\`\`\`

### Example Resource

#### List Items
\`\`\`http
GET /api/items
\`\`\`

#### Get Item
\`\`\`http
GET /api/items/:id
\`\`\`

#### Create Item
\`\`\`http
POST /api/items
Content-Type: application/json

{
  "name": "Item Name",
  "description": "Item description"
}
\`\`\`

#### Update Item
\`\`\`http
PUT /api/items/:id
\`\`\`

#### Delete Item
\`\`\`http
DELETE /api/items/:id
\`\`\`
`}

${ctx.techStack?.documentProcessing ? `## Document Processing API

### Upload Document
\`\`\`http
POST /api/documents/upload
Content-Type: multipart/form-data

file: <binary>
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "data": {
    "documentId": "doc_123",
    "fileName": "medical_record.pdf",
    "status": "processing",
    "estimatedTime": 30
  }
}
\`\`\`

### Get Document Status
\`\`\`http
GET /api/documents/:documentId/status
\`\`\`

### Get Extracted Data
\`\`\`http
GET /api/documents/:documentId/extracted
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "data": {
    "documentId": "doc_123",
    "status": "completed",
    "extractedFields": [
      {
        "field": "patient_name",
        "value": "John Doe",
        "confidence": 0.98
      }
    ],
    "rawText": "..."
  }
}
\`\`\`
` : ''}

## Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Payload
\`\`\`json
{
  "event": "record.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": { ... }
}
\`\`\`

### Available Events
- \`record.created\`
- \`record.updated\`
- \`record.deleted\`
${ctx.techStack?.documentProcessing ? `- \`document.processed\`
- \`document.extraction_complete\`` : ''}

## SDKs and Libraries

Official SDKs are available for:
- JavaScript/TypeScript: \`npm install @${projectName.toLowerCase().replace(/\s+/g, '-')}/sdk\`
- Python: \`pip install ${projectName.toLowerCase().replace(/\s+/g, '-')}\`

## Support

For API support, contact:
- Email: api-support@your-org.com
- Documentation: https://docs.your-domain.com
`;
}
