import type { GenerationContext } from "../index.js";

export async function mockLLM(prompt: string) {
  console.log("Mock LLM invoked");

  return {
    app: {
      name: "Generated App",
      domains: inferDomain(prompt),
      channels: ["web"]
    },
    dataModel: {
      entities: ["User", "Order", "Asset"]
    },
    workflows: ["Create", "Update", "Audit"],
    deployment: {
      backend: "Node.js",
      frontend: "React",
      database: "PostgreSQL"
    }
  };
}

function inferDomain(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("manufacturing")) return ["manufacturing"];
  if (p.includes("health")) return ["healthcare"];
  if (p.includes("insurance")) return ["insurance"];
  if (p.includes("billing") || p.includes("ami")) return ["ami", "cis"];
  return ["generic"];
}

export async function mockLLMForType(type: string, context: GenerationContext) {
  console.log(`Mock LLM for type: ${type}`);
  
  const domainModules = getDomainModules(context.domain);
  const domainScreens = getDomainScreens(context.domain);
  const domainTables = getDomainTables(context.domain, context.database);
  const domainTests = getDomainTests(context.domain);
  const domainIntegrations = getDomainIntegrations(context.domain);
  const scaffolding = getScaffolding(context.domain);
  const multiTenant = getMultiTenantConfig(
    context.multiTenant?.enabled || false,
    context.multiTenant?.level || 'none'
  );
  const multiLingual = getMultiLingualConfig(
    context.multiLingual?.enabled || false,
    context.multiLingual?.level || 'none',
    context.multiLingual?.languages || []
  );

  switch (type) {
    case "modules":
      return { modules: domainModules };
    case "screens":
      return { screens: domainScreens };
    case "tables":
      return { tables: domainTables };
    case "tests":
      return { tests: domainTests };
    case "integrations":
      return { integrations: domainIntegrations };
    case "scaffolding":
      return { scaffolding };
    case "all":
      return {
        modules: domainModules,
        screens: domainScreens,
        tables: domainTables,
        tests: domainTests,
        integrations: domainIntegrations,
        scaffolding,
        multiTenant,
        multiLingual
      };
    default:
      return { error: `Unknown type: ${type}` };
  }
}

function getDomainModules(domain: string) {
  const baseModules = [
    { name: "Authentication", description: "User login, SSO, MFA support", priority: "core" },
    { name: "User Management", description: "User CRUD, roles, permissions", priority: "core" },
    { name: "Audit Log", description: "Track all system changes", priority: "core" },
    { name: "Notifications", description: "Email, SMS, push notifications", priority: "standard" },
    { name: "Reports", description: "Generate and export reports", priority: "standard" },
    { name: "Dashboard", description: "KPIs and real-time metrics", priority: "core" }
  ];

  const domainSpecific: Record<string, typeof baseModules> = {
    ami: [
      { name: "Meter Data Management", description: "Collect, validate, and store meter readings", priority: "core" },
      { name: "Outage Detection", description: "Real-time outage monitoring and alerts", priority: "core" },
      { name: "Demand Response", description: "Load management and peak shaving", priority: "standard" },
      { name: "Billing Integration", description: "Generate consumption data for billing", priority: "core" },
      { name: "Asset Registry", description: "Track meters, transformers, infrastructure", priority: "core" },
      { name: "DLMS/COSEM Gateway", description: "Protocol adapter for smart meters", priority: "core" }
    ],
    cis: [
      { name: "Customer Accounts", description: "Customer profile and account management", priority: "core" },
      { name: "Service Agreements", description: "Track service contracts and terms", priority: "core" },
      { name: "Billing Engine", description: "Calculate and generate bills", priority: "core" },
      { name: "Payment Processing", description: "Handle payments and collections", priority: "core" },
      { name: "Dispute Management", description: "Track and resolve customer disputes", priority: "standard" }
    ],
    crm: [
      { name: "Contact Management", description: "Track customers and interactions", priority: "core" },
      { name: "Lead Tracking", description: "Manage sales pipeline", priority: "core" },
      { name: "Campaign Management", description: "Marketing campaigns and analytics", priority: "standard" },
      { name: "Case Management", description: "Support tickets and resolution", priority: "core" }
    ],
    healthcare: [
      { name: "Patient Registry", description: "Patient demographics and history", priority: "core" },
      { name: "Appointments", description: "Scheduling and calendar management", priority: "core" },
      { name: "Electronic Health Records", description: "Clinical documentation and notes", priority: "core" },
      { name: "Lab Results", description: "Test ordering and results tracking", priority: "core" },
      { name: "Prescriptions", description: "e-Prescribing and medication management", priority: "core" },
      { name: "HL7/FHIR Integration", description: "Healthcare data exchange", priority: "core" }
    ],
    banking: [
      { name: "Account Management", description: "Customer accounts and balances", priority: "core" },
      { name: "Transaction Processing", description: "Real-time transaction handling", priority: "core" },
      { name: "Loan Management", description: "Loan origination and servicing", priority: "core" },
      { name: "KYC/AML", description: "Identity verification and compliance", priority: "core" },
      { name: "Cards Management", description: "Credit/debit card lifecycle", priority: "standard" }
    ],
    insurance: [
      { name: "Policy Administration", description: "Policy lifecycle management", priority: "core" },
      { name: "Claims Processing", description: "Claims intake and adjudication", priority: "core" },
      { name: "Underwriting", description: "Risk assessment and pricing", priority: "core" },
      { name: "Agent Portal", description: "Agent management and commissions", priority: "standard" },
      { name: "Document Management", description: "Policy documents and attachments", priority: "core" }
    ],
    manufacturing: [
      { name: "Work Orders", description: "Production scheduling and tracking", priority: "core" },
      { name: "Inventory Management", description: "Materials and stock control", priority: "core" },
      { name: "Quality Control", description: "Inspection and defect tracking", priority: "core" },
      { name: "Equipment Maintenance", description: "Preventive and corrective maintenance", priority: "standard" },
      { name: "OPC-UA Gateway", description: "Industrial protocol integration", priority: "core" }
    ],
    retail: [
      { name: "Product Catalog", description: "Product information management", priority: "core" },
      { name: "Order Management", description: "Order processing and fulfillment", priority: "core" },
      { name: "Inventory", description: "Stock levels and replenishment", priority: "core" },
      { name: "Promotions", description: "Discounts and pricing rules", priority: "standard" },
      { name: "Customer Loyalty", description: "Points and rewards program", priority: "standard" }
    ]
  };

  return [...baseModules, ...(domainSpecific[domain] || [])];
}

function getDomainScreens(domain: string) {
  const baseScreens = [
    { name: "Login", type: "auth", description: "User authentication screen" },
    { name: "Dashboard", type: "overview", description: "Main dashboard with KPIs" },
    { name: "User List", type: "list", description: "View and manage users" },
    { name: "User Form", type: "form", description: "Create/edit user details" },
    { name: "Settings", type: "config", description: "System configuration" },
    { name: "Profile", type: "form", description: "User profile management" }
  ];

  const domainSpecific: Record<string, typeof baseScreens> = {
    ami: [
      { name: "Meter Map", type: "map", description: "Geographic view of meters" },
      { name: "Meter Details", type: "detail", description: "Individual meter info and readings" },
      { name: "Reading History", type: "chart", description: "Historical consumption data" },
      { name: "Outage Dashboard", type: "monitor", description: "Real-time outage tracking" },
      { name: "Demand Response", type: "control", description: "Load management controls" },
      { name: "Asset Registry", type: "list", description: "Equipment and infrastructure" }
    ],
    cis: [
      { name: "Customer Search", type: "search", description: "Find customers quickly" },
      { name: "Account Details", type: "detail", description: "Customer account overview" },
      { name: "Bill View", type: "detail", description: "Current and past bills" },
      { name: "Payment Entry", type: "form", description: "Record customer payments" },
      { name: "Service Request", type: "form", description: "Create service tickets" }
    ],
    healthcare: [
      { name: "Patient Search", type: "search", description: "Find patient records" },
      { name: "Patient Chart", type: "detail", description: "Complete patient information" },
      { name: "Appointment Calendar", type: "calendar", description: "Schedule management" },
      { name: "Clinical Notes", type: "form", description: "Document encounters" },
      { name: "Lab Results", type: "list", description: "View test results" },
      { name: "Prescription Pad", type: "form", description: "Order medications" }
    ],
    banking: [
      { name: "Account Overview", type: "detail", description: "Account balances and activity" },
      { name: "Transfer", type: "form", description: "Fund transfer screen" },
      { name: "Transaction History", type: "list", description: "Account transactions" },
      { name: "Loan Application", type: "wizard", description: "Multi-step loan form" },
      { name: "Statement View", type: "document", description: "Account statements" }
    ]
  };

  return [...baseScreens, ...(domainSpecific[domain] || [])];
}

function getDomainTables(domain: string, database: string) {
  const baseTables = [
    {
      name: "users",
      columns: [
        { name: "id", type: "uuid", primary: true },
        { name: "email", type: "varchar(255)", unique: true },
        { name: "password_hash", type: "varchar(255)" },
        { name: "full_name", type: "varchar(255)" },
        { name: "role", type: "varchar(50)" },
        { name: "created_at", type: "timestamp" },
        { name: "updated_at", type: "timestamp" }
      ]
    },
    {
      name: "audit_logs",
      columns: [
        { name: "id", type: "bigserial", primary: true },
        { name: "user_id", type: "uuid", foreignKey: "users.id" },
        { name: "action", type: "varchar(100)" },
        { name: "entity_type", type: "varchar(100)" },
        { name: "entity_id", type: "varchar(255)" },
        { name: "changes", type: "jsonb" },
        { name: "created_at", type: "timestamp" }
      ]
    }
  ];

  const domainSpecific: Record<string, typeof baseTables> = {
    ami: [
      {
        name: "meters",
        columns: [
          { name: "id", type: "uuid", primary: true },
          { name: "serial_number", type: "varchar(50)", unique: true },
          { name: "meter_type", type: "varchar(50)" },
          { name: "manufacturer", type: "varchar(100)" },
          { name: "installation_date", type: "date" },
          { name: "location_lat", type: "decimal(10,8)" },
          { name: "location_lng", type: "decimal(11,8)" },
          { name: "status", type: "varchar(20)" }
        ]
      },
      {
        name: "meter_readings",
        columns: [
          { name: "id", type: "bigserial", primary: true },
          { name: "meter_id", type: "uuid", foreignKey: "meters.id" },
          { name: "reading_time", type: "timestamptz" },
          { name: "value_kwh", type: "decimal(15,4)" },
          { name: "quality_flag", type: "varchar(10)" }
        ]
      }
    ],
    healthcare: [
      {
        name: "patients",
        columns: [
          { name: "id", type: "uuid", primary: true },
          { name: "mrn", type: "varchar(20)", unique: true },
          { name: "first_name", type: "varchar(100)" },
          { name: "last_name", type: "varchar(100)" },
          { name: "date_of_birth", type: "date" },
          { name: "gender", type: "varchar(10)" },
          { name: "ssn_encrypted", type: "bytea" }
        ]
      },
      {
        name: "encounters",
        columns: [
          { name: "id", type: "uuid", primary: true },
          { name: "patient_id", type: "uuid", foreignKey: "patients.id" },
          { name: "provider_id", type: "uuid", foreignKey: "users.id" },
          { name: "encounter_date", type: "timestamptz" },
          { name: "type", type: "varchar(50)" },
          { name: "notes", type: "text" }
        ]
      }
    ],
    banking: [
      {
        name: "accounts",
        columns: [
          { name: "id", type: "uuid", primary: true },
          { name: "account_number", type: "varchar(20)", unique: true },
          { name: "customer_id", type: "uuid" },
          { name: "account_type", type: "varchar(30)" },
          { name: "balance", type: "decimal(18,2)" },
          { name: "currency", type: "varchar(3)" },
          { name: "status", type: "varchar(20)" }
        ]
      },
      {
        name: "transactions",
        columns: [
          { name: "id", type: "uuid", primary: true },
          { name: "account_id", type: "uuid", foreignKey: "accounts.id" },
          { name: "transaction_type", type: "varchar(30)" },
          { name: "amount", type: "decimal(18,2)" },
          { name: "timestamp", type: "timestamptz" },
          { name: "reference", type: "varchar(100)" }
        ]
      }
    ]
  };

  return [...baseTables, ...(domainSpecific[domain] || [])];
}

function getDomainTests(domain: string) {
  const baseTests = [
    { name: "User Authentication", type: "unit", coverage: ["login", "logout", "token refresh"] },
    { name: "Authorization Rules", type: "unit", coverage: ["role-based access", "permission checks"] },
    { name: "API Endpoints", type: "integration", coverage: ["CRUD operations", "error handling"] },
    { name: "Database Migrations", type: "integration", coverage: ["schema validation", "data integrity"] },
    { name: "E2E User Flow", type: "e2e", coverage: ["registration", "login", "main workflow"] }
  ];

  const domainSpecific: Record<string, typeof baseTests> = {
    ami: [
      { name: "Meter Reading Validation", type: "unit", coverage: ["value ranges", "timestamp checks", "quality flags"] },
      { name: "Consumption Calculation", type: "unit", coverage: ["interval math", "TOU rates", "demand"] },
      { name: "Outage Detection", type: "integration", coverage: ["last gasp processing", "restoration events"] },
      { name: "DLMS Protocol", type: "integration", coverage: ["meter communication", "data parsing"] }
    ],
    healthcare: [
      { name: "HIPAA Compliance", type: "security", coverage: ["data encryption", "access logging", "PHI handling"] },
      { name: "HL7 Message Parsing", type: "integration", coverage: ["ADT messages", "ORU results"] },
      { name: "Patient Matching", type: "unit", coverage: ["MRN lookup", "demographic matching"] }
    ],
    banking: [
      { name: "Transaction Processing", type: "integration", coverage: ["fund transfer", "balance updates", "reversals"] },
      { name: "Fraud Detection", type: "unit", coverage: ["velocity checks", "amount limits", "geo validation"] },
      { name: "Regulatory Reporting", type: "integration", coverage: ["CTR generation", "SAR filing"] }
    ]
  };

  return [...baseTests, ...(domainSpecific[domain] || [])];
}

function getDomainIntegrations(domain: string) {
  const baseIntegrations = [
    { name: "Email Service", type: "communication", provider: "SendGrid", description: "Transactional and marketing emails", required: true },
    { name: "SMS Gateway", type: "communication", provider: "Twilio", description: "SMS notifications and 2FA", required: false },
    { name: "Push Notifications", type: "communication", provider: "Firebase", description: "Mobile push notifications", required: false },
    { name: "Analytics", type: "analytics", provider: "Mixpanel", description: "User behavior analytics", required: false },
    { name: "Error Tracking", type: "analytics", provider: "Sentry", description: "Application error monitoring", required: true },
    { name: "Object Storage", type: "storage", provider: "AWS S3", description: "File and document storage", required: true },
    { name: "Identity Provider", type: "auth", provider: "Auth0", description: "SSO and social login", required: false }
  ];

  const domainSpecific: Record<string, typeof baseIntegrations> = {
    ami: [
      { name: "MQTT Broker", type: "other", provider: "HiveMQ", description: "IoT device messaging", required: true },
      { name: "Time-Series DB", type: "storage", provider: "TimescaleDB", description: "High-volume meter data storage", required: true },
      { name: "GIS Service", type: "other", provider: "Mapbox", description: "Geographic mapping and visualization", required: false }
    ],
    cis: [
      { name: "Payment Gateway", type: "payment", provider: "Stripe", description: "Credit card and ACH payments", required: true },
      { name: "Bill Presentment", type: "other", provider: "Custom", description: "Electronic bill delivery", required: true },
      { name: "Address Validation", type: "other", provider: "SmartyStreets", description: "USPS address verification", required: false }
    ],
    healthcare: [
      { name: "Payment Gateway", type: "payment", provider: "Stripe", description: "Patient payment processing", required: true },
      { name: "HL7/FHIR Gateway", type: "other", provider: "Epic/Cerner", description: "EHR data exchange", required: true },
      { name: "E-Prescribing", type: "other", provider: "Surescripts", description: "Electronic prescription network", required: true },
      { name: "Insurance Eligibility", type: "other", provider: "Availity", description: "Real-time eligibility checks", required: false }
    ],
    banking: [
      { name: "Payment Gateway", type: "payment", provider: "Stripe", description: "Card payment processing", required: true },
      { name: "ACH Processing", type: "payment", provider: "Plaid", description: "Bank account verification and transfers", required: true },
      { name: "Real-Time Payments", type: "payment", provider: "Visa Direct", description: "Instant fund transfers", required: false },
      { name: "KYC/AML Service", type: "other", provider: "Jumio", description: "Identity verification", required: true },
      { name: "Credit Bureau", type: "other", provider: "Experian", description: "Credit checks and reports", required: false }
    ],
    insurance: [
      { name: "Payment Gateway", type: "payment", provider: "Stripe", description: "Premium payment processing", required: true },
      { name: "Document Generation", type: "other", provider: "DocuSign", description: "Policy document signing", required: true },
      { name: "Claims Automation", type: "other", provider: "Guidewire", description: "Claims processing integration", required: false },
      { name: "Rating Engine", type: "other", provider: "Custom", description: "Premium calculation service", required: true }
    ],
    retail: [
      { name: "Payment Gateway", type: "payment", provider: "Stripe", description: "Online payment processing", required: true },
      { name: "PayPal", type: "payment", provider: "PayPal", description: "Alternative payment method", required: false },
      { name: "Shipping", type: "other", provider: "ShipStation", description: "Multi-carrier shipping", required: true },
      { name: "Tax Calculation", type: "other", provider: "Avalara", description: "Sales tax automation", required: true },
      { name: "Inventory Sync", type: "other", provider: "Custom", description: "Multi-channel inventory", required: false }
    ],
    manufacturing: [
      { name: "OPC-UA Server", type: "other", provider: "Custom", description: "Industrial equipment integration", required: true },
      { name: "ERP Integration", type: "other", provider: "SAP", description: "Enterprise resource planning", required: false },
      { name: "Quality Management", type: "other", provider: "Custom", description: "QMS integration", required: false }
    ],
    crm: [
      { name: "Email Marketing", type: "communication", provider: "Mailchimp", description: "Campaign management", required: false },
      { name: "Calendar Integration", type: "other", provider: "Google/Microsoft", description: "Meeting scheduling", required: true },
      { name: "Phone System", type: "communication", provider: "Twilio", description: "Call tracking and recording", required: false }
    ]
  };

  return [...baseIntegrations, ...(domainSpecific[domain] || [])];
}

function getScaffolding(domain: string) {
  const folders = [
    "src/",
    "src/api/",
    "src/api/routes/",
    "src/api/middleware/",
    "src/api/validators/",
    "src/services/",
    "src/services/domain/",
    "src/services/integrations/",
    "src/models/",
    "src/models/entities/",
    "src/models/dto/",
    "src/repositories/",
    "src/utils/",
    "src/config/",
    "src/types/",
    "tests/",
    "tests/unit/",
    "tests/integration/",
    "tests/e2e/",
    "docs/",
    "scripts/",
    "migrations/"
  ];

  const baseFiles = [
    { path: "src/index.ts", description: "Application entry point" },
    { path: "src/app.ts", description: "Express/Fastify app setup" },
    { path: "src/config/database.ts", description: "Database connection configuration" },
    { path: "src/config/env.ts", description: "Environment variables" },
    { path: "src/api/routes/index.ts", description: "Route aggregator" },
    { path: "src/api/routes/auth.ts", description: "Authentication routes" },
    { path: "src/api/routes/users.ts", description: "User management routes" },
    { path: "src/api/middleware/auth.ts", description: "JWT authentication middleware" },
    { path: "src/api/middleware/validation.ts", description: "Request validation middleware" },
    { path: "src/api/middleware/errorHandler.ts", description: "Global error handler" },
    { path: "src/services/authService.ts", description: "Authentication business logic" },
    { path: "src/services/userService.ts", description: "User management logic" },
    { path: "src/models/entities/User.ts", description: "User entity model" },
    { path: "src/models/entities/AuditLog.ts", description: "Audit log entity" },
    { path: "src/repositories/userRepository.ts", description: "User data access" },
    { path: "src/utils/logger.ts", description: "Logging utility" },
    { path: "src/utils/crypto.ts", description: "Encryption utilities" },
    { path: "src/types/index.ts", description: "Type definitions" },
    { path: "tests/unit/authService.test.ts", description: "Auth service tests" },
    { path: "tests/integration/api.test.ts", description: "API integration tests" },
    { path: "package.json", description: "Project dependencies" },
    { path: "tsconfig.json", description: "TypeScript configuration" },
    { path: ".env.example", description: "Environment template" },
    { path: "Dockerfile", description: "Container configuration" },
    { path: "docker-compose.yml", description: "Local development setup" }
  ];

  const domainFiles: Record<string, typeof baseFiles> = {
    ami: [
      { path: "src/api/routes/meters.ts", description: "Meter management routes" },
      { path: "src/api/routes/readings.ts", description: "Reading collection routes" },
      { path: "src/services/domain/meterService.ts", description: "Meter business logic" },
      { path: "src/services/domain/readingService.ts", description: "Reading processing" },
      { path: "src/services/integrations/dlmsGateway.ts", description: "DLMS protocol adapter" },
      { path: "src/services/integrations/mqttClient.ts", description: "MQTT message handler" },
      { path: "src/models/entities/Meter.ts", description: "Meter entity" },
      { path: "src/models/entities/MeterReading.ts", description: "Reading entity" }
    ],
    healthcare: [
      { path: "src/api/routes/patients.ts", description: "Patient management routes" },
      { path: "src/api/routes/encounters.ts", description: "Encounter routes" },
      { path: "src/services/domain/patientService.ts", description: "Patient business logic" },
      { path: "src/services/domain/ehrService.ts", description: "EHR integration" },
      { path: "src/services/integrations/hl7Parser.ts", description: "HL7 message parser" },
      { path: "src/services/integrations/fhirClient.ts", description: "FHIR API client" },
      { path: "src/models/entities/Patient.ts", description: "Patient entity" },
      { path: "src/models/entities/Encounter.ts", description: "Encounter entity" }
    ],
    banking: [
      { path: "src/api/routes/accounts.ts", description: "Account management routes" },
      { path: "src/api/routes/transactions.ts", description: "Transaction routes" },
      { path: "src/services/domain/accountService.ts", description: "Account business logic" },
      { path: "src/services/domain/transactionService.ts", description: "Transaction processing" },
      { path: "src/services/integrations/plaidClient.ts", description: "Plaid integration" },
      { path: "src/services/integrations/stripeClient.ts", description: "Stripe payment client" },
      { path: "src/models/entities/Account.ts", description: "Account entity" },
      { path: "src/models/entities/Transaction.ts", description: "Transaction entity" }
    ],
    retail: [
      { path: "src/api/routes/products.ts", description: "Product catalog routes" },
      { path: "src/api/routes/orders.ts", description: "Order management routes" },
      { path: "src/services/domain/productService.ts", description: "Product business logic" },
      { path: "src/services/domain/orderService.ts", description: "Order processing" },
      { path: "src/services/integrations/stripeClient.ts", description: "Stripe payment client" },
      { path: "src/services/integrations/shippingClient.ts", description: "Shipping integration" },
      { path: "src/models/entities/Product.ts", description: "Product entity" },
      { path: "src/models/entities/Order.ts", description: "Order entity" }
    ]
  };

  return {
    folders,
    files: [...baseFiles, ...(domainFiles[domain] || [])]
  };
}

function getMultiTenantConfig(enabled: boolean, level: string) {
  if (!enabled) {
    return { enabled: false, level: 'none', isolation: 'none' };
  }
  
  const actualLevel = level || 'ui-and-db';
  let isolation = 'none';
  
  if (actualLevel === 'ui-and-db') {
    isolation = 'schema';
  } else if (actualLevel === 'ui-only') {
    isolation = 'none';
  }
  
  return {
    enabled: true,
    level: actualLevel,
    isolation
  };
}

function getMultiLingualConfig(enabled: boolean, level: string, languages: string[]) {
  if (!enabled) {
    return { enabled: false, level: 'none', defaultLanguage: 'en', supportedLanguages: ['en'] };
  }
  return {
    enabled: true,
    level: level || 'ui-only',
    defaultLanguage: 'en',
    supportedLanguages: languages?.length > 0 ? languages : ['en', 'es', 'fr', 'de']
  };
}
