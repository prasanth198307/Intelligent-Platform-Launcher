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

  switch (type) {
    case "modules":
      return { modules: domainModules };
    case "screens":
      return { screens: domainScreens };
    case "tables":
      return { tables: domainTables };
    case "tests":
      return { tests: domainTests };
    case "all":
      return {
        modules: domainModules,
        screens: domainScreens,
        tables: domainTables,
        tests: domainTests
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
