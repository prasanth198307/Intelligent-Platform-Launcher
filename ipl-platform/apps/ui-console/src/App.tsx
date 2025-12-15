import { useState, useEffect } from "react";
import "./App.css";
import ArchitectureDiagram from "./ArchitectureDiagram";
import AICodePanel from "./AICodePanel";
import DevOpsPanel from "./DevOpsPanel";
import BenchmarkPanel from "./BenchmarkPanel";
import ERDiagram from "./ERDiagram";
import ApiTestPanel from "./ApiTestPanel";
import CodeEditor from "./CodeEditor";
import AIAutomationPanel from "./AIAutomationPanel";
import IntegrationPanel from "./IntegrationPanel";
import DevToolsPanel from "./DevToolsPanel";
import TestingQualityPanel from "./TestingQualityPanel";
import DataConnectivityPanel from "./DataConnectivityPanel";
import MonitoringPanel from "./MonitoringPanel";
import EnvironmentPanel from "./EnvironmentPanel";
import GuidedWizard from "./GuidedWizard";

const API_BASE_URL = '';

function getSessionId(): string {
  let sessionId = localStorage.getItem('ipl-session-id');
  if (!sessionId) {
    sessionId = 'session-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ipl-session-id', sessionId);
  }
  return sessionId;
}

interface SavedWorkspace {
  id: number;
  name: string;
  domain: string;
  database: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InfraSpec {
  tier: string;
  dailyRecords: string;
  dailyRecordsNum: number;
  devices: string;
  devicesNum: number;
  compute: {
    appServers: number;
    appServerVCPU: number;
    appServerRAM: number;
    dbPrimary: number;
    dbReplicas: number;
    dbVCPU: number;
    dbRAM: number;
    cacheNodes: number;
    cacheRAM: number;
    queueBrokers: number;
    queueVCPU: number;
    queueRAM: number;
    totalCPU: number;
    totalRAM: number;
    totalRAMDisplay: string;
  };
  storage: {
    databaseGB: number;
    backupGB: number;
    logsGB: number;
    totalGB: number;
    database: string;
    backup: string;
    logs: string;
    total: string;
  };
  network: {
    ingressMbps: number;
    egressMbps: number;
    internalGbps: number;
    monthlyEgressGB: number;
    ingress: string;
    egress: string;
    internal: string;
  };
}

interface CostEstimate {
  compute: number;
  storage: number;
  network: number;
  database: number;
  cache: number;
  queue: number;
  total: number;
  currency: string;
}

interface SecurityReq {
  name: string;
  description: string;
  status: 'required' | 'recommended' | 'included';
}

interface ClusterConfig {
  appCluster: {
    nodes: number;
    loadBalancer: string;
    autoScaling: boolean;
    minNodes: number;
    maxNodes: number;
  };
  dbCluster: {
    type: string;
    primaryNodes: number;
    replicaNodes: number;
    sharding: boolean;
    replicationMode: string;
  };
}

interface MobileConfig {
  platform: string[];
  framework: string;
  features: string[];
}

interface GeneratedModule {
  name: string;
  description: string;
  priority: string;
}

interface GeneratedScreen {
  name: string;
  type: string;
  description: string;
}

interface TableColumn {
  name: string;
  type: string;
  primary?: boolean;
  unique?: boolean;
  foreignKey?: string;
}

interface GeneratedTable {
  name: string;
  columns: TableColumn[];
}

interface GeneratedTest {
  name: string;
  type: string;
  coverage: string[];
}

interface Integration {
  name: string;
  type: 'payment' | 'communication' | 'analytics' | 'storage' | 'auth' | 'other';
  provider: string;
  description: string;
  required: boolean;
}

interface ScaffoldingStructure {
  folders: string[];
  files: { path: string; description: string }[];
}

interface MultiTenantConfig {
  enabled: boolean;
  level: 'ui-only' | 'ui-and-db' | 'none';
  isolation: 'schema' | 'database' | 'row-level';
}

interface MultiLingualConfig {
  enabled: boolean;
  level: 'ui-only' | 'ui-and-db' | 'none';
  defaultLanguage: string;
  supportedLanguages: string[];
}

interface CICDConfig {
  enabled: boolean;
  provider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops' | 'circleci';
  features: string[];
}

interface APIGatewayConfig {
  enabled: boolean;
  provider: 'kong' | 'aws-api-gateway' | 'azure-apim' | 'nginx' | 'envoy';
  features: string[];
}

interface MonitoringConfig {
  enabled: boolean;
  stack: 'prometheus-grafana' | 'elk' | 'datadog' | 'newrelic' | 'cloudwatch';
  features: string[];
}

interface BackupDRConfig {
  enabled: boolean;
  rpoHours: number;
  rtoHours: number;
  strategy: 'hot-standby' | 'warm-standby' | 'cold-backup' | 'pilot-light';
  features: string[];
}

interface EnvironmentConfig {
  enabled: boolean;
  environments: string[];
  promotionStrategy: 'manual' | 'gitops' | 'auto-promote';
  features: string[];
}

interface NotificationConfig {
  enabled: boolean;
  channels: string[];
  features: string[];
}

interface DocumentationConfig {
  enabled: boolean;
  types: string[];
  features: string[];
}

interface PerformanceSLAConfig {
  enabled: boolean;
  latencyP99Ms: number;
  uptimePercent: number;
  features: string[];
}

interface DataMigrationConfig {
  enabled: boolean;
  strategy: 'big-bang' | 'phased' | 'parallel-run' | 'strangler';
  features: string[];
}

interface VersionControlConfig {
  enabled: boolean;
  strategy: 'gitflow' | 'github-flow' | 'trunk-based' | 'feature-branch';
  features: string[];
}

interface CrossDomainFeatures {
  cicd: CICDConfig;
  apiGateway: APIGatewayConfig;
  monitoring: MonitoringConfig;
  backupDR: BackupDRConfig;
  environments: EnvironmentConfig;
  notifications: NotificationConfig;
  documentation: DocumentationConfig;
  performanceSLA: PerformanceSLAConfig;
  dataMigration: DataMigrationConfig;
  versionControl: VersionControlConfig;
}

interface GeneratedArtifacts {
  modules: GeneratedModule[];
  screens: GeneratedScreen[];
  tables: GeneratedTable[];
  tests: GeneratedTest[];
  integrations: Integration[];
  scaffolding: ScaffoldingStructure;
  multiTenant: MultiTenantConfig;
  multiLingual: MultiLingualConfig;
  crossDomain: CrossDomainFeatures;
}

interface TechComponent {
  name: string;
  description: string;
}

interface TechStackRecommendation {
  tier: string;
  primaryDb: TechComponent;
  analyticsDb: TechComponent;
  queue: TechComponent;
  cache: TechComponent;
  backend: TechComponent;
  frontend: TechComponent;
  streaming: TechComponent;
  etl: TechComponent;
  analytics: TechComponent;
  dataWarehouse: TechComponent;
  dataLake: TechComponent;
  dataIngestion: TechComponent;
  dataGovernance: TechComponent;
}

interface AnalysisResult {
  domain: string;
  infrastructure: InfraSpec;
  architecture: string;
  costs: Record<string, CostEstimate>;
  security: SecurityReq[];
  clusterConfig: ClusterConfig;
  mobileConfig: MobileConfig;
  deploymentFormats: string[];
  techStack?: TechStackRecommendation;
}

interface DomainConfig {
  id: string;
  name: string;
  icon: string;
  entityLabel: string;
  entityPlaceholder: string;
  transactionLabel: string;
  transactionPlaceholder: string;
  defaultCompliance: string[];
  standards: string[];
}

const DOMAINS: DomainConfig[] = [
  { 
    id: 'ami', 
    name: 'AMI / Smart Metering', 
    icon: '⚡',
    entityLabel: 'Number of Devices / Meters',
    entityPlaceholder: 'e.g., 5000000',
    transactionLabel: 'Readings per Day (per meter)',
    transactionPlaceholder: 'e.g., 96 (every 15 min)',
    defaultCompliance: ['iso27001'],
    standards: ['iec62056', 'dlms', 'ieee2030']
  },
  { 
    id: 'cis', 
    name: 'CIS (Customer Information)', 
    icon: '👥',
    entityLabel: 'Number of Customer Accounts',
    entityPlaceholder: 'e.g., 1000000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['soc2', 'iso27001'],
    standards: ['naesb', 'nerccip']
  },
  { 
    id: 'crm', 
    name: 'CRM (Customer Relationship)', 
    icon: '🤝',
    entityLabel: 'Number of Customers / Contacts',
    entityPlaceholder: 'e.g., 500000',
    transactionLabel: 'Interactions per Day',
    transactionPlaceholder: 'e.g., 10000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: []
  },
  { 
    id: 'ivrs', 
    name: 'IVRS (Voice Response)', 
    icon: '📞',
    entityLabel: 'Concurrent Call Capacity',
    entityPlaceholder: 'e.g., 500',
    transactionLabel: 'Calls per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['soc2'],
    standards: ['tcpa', 'fcc']
  },
  { 
    id: 'contactcenter', 
    name: 'Contact Center / CCAI', 
    icon: '🎧',
    entityLabel: 'Number of Agents',
    entityPlaceholder: 'e.g., 200',
    transactionLabel: 'Interactions per Day',
    transactionPlaceholder: 'e.g., 25000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: ['tcpa', 'fcc']
  },
  { 
    id: 'banking', 
    name: 'Banking & Finance', 
    icon: '🏦',
    entityLabel: 'Number of Accounts',
    entityPlaceholder: 'e.g., 1000000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 500000',
    defaultCompliance: ['pci', 'soc2'],
    standards: ['sox', 'glba', 'basel3', 'pci']
  },
  { 
    id: 'insurance', 
    name: 'Insurance', 
    icon: '🛡️',
    entityLabel: 'Number of Policies',
    entityPlaceholder: 'e.g., 500000',
    transactionLabel: 'Claims / Transactions per Day',
    transactionPlaceholder: 'e.g., 5000',
    defaultCompliance: ['soc2', 'iso27001'],
    standards: ['naic', 'ifrs17']
  },
  { 
    id: 'healthcare', 
    name: 'Healthcare', 
    icon: '🏥',
    entityLabel: 'Number of Patients',
    entityPlaceholder: 'e.g., 500000',
    transactionLabel: 'Records / Encounters per Day',
    transactionPlaceholder: 'e.g., 10000',
    defaultCompliance: ['hipaa'],
    standards: ['hl7', 'fhir', 'dicom', 'hipaa']
  },
  { 
    id: 'manufacturing', 
    name: 'Manufacturing', 
    icon: '🏭',
    entityLabel: 'Number of Machines / Sensors',
    entityPlaceholder: 'e.g., 10000',
    transactionLabel: 'Data Points per Day',
    transactionPlaceholder: 'e.g., 1000000',
    defaultCompliance: ['iso27001'],
    standards: ['isa95', 'opcua']
  },
  { 
    id: 'retail', 
    name: 'Retail & E-commerce', 
    icon: '🛒',
    entityLabel: 'Number of Products / SKUs',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Orders per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['pci', 'gdpr'],
    standards: ['pci']
  },
  { 
    id: 'legal', 
    name: 'Legal & Law Firms', 
    icon: '⚖️',
    entityLabel: 'Number of Cases / Matters',
    entityPlaceholder: 'e.g., 10000',
    transactionLabel: 'Documents / Actions per Day',
    transactionPlaceholder: 'e.g., 5000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: ['aba', 'gdpr']
  },
  { 
    id: 'accounting', 
    name: 'Accounting & Finance', 
    icon: '📊',
    entityLabel: 'Number of Clients / Accounts',
    entityPlaceholder: 'e.g., 50000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 100000',
    defaultCompliance: ['soc2', 'gdpr'],
    standards: ['gaap', 'ifrs', 'sox']
  },
  { 
    id: 'erp', 
    name: 'ERP (Enterprise Resource Planning)', 
    icon: '🏢',
    entityLabel: 'Number of Users / Employees',
    entityPlaceholder: 'e.g., 5000',
    transactionLabel: 'Business Transactions per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['soc2', 'iso27001'],
    standards: ['gaap', 'ifrs', 'sox', 'iso9001']
  },
  { 
    id: 'education', 
    name: 'Education / EdTech', 
    icon: '🎓',
    entityLabel: 'Number of Students / Users',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Learning Activities per Day',
    transactionPlaceholder: 'e.g., 500000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: ['ferpa', 'coppa']
  },
  { 
    id: 'realestate', 
    name: 'Real Estate / Property', 
    icon: '🏠',
    entityLabel: 'Number of Properties',
    entityPlaceholder: 'e.g., 50000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 10000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: []
  },
  { 
    id: 'logistics', 
    name: 'Logistics / Supply Chain', 
    icon: '🚚',
    entityLabel: 'Number of Shipments / Assets',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Tracking Events per Day',
    transactionPlaceholder: 'e.g., 1000000',
    defaultCompliance: ['iso27001', 'soc2'],
    standards: ['iso28000', 'ctpat']
  },
  { 
    id: 'hospitality', 
    name: 'Hospitality / Hotels', 
    icon: '🏨',
    entityLabel: 'Number of Rooms / Locations',
    entityPlaceholder: 'e.g., 10000',
    transactionLabel: 'Bookings per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['pci', 'gdpr'],
    standards: ['pci']
  },
  { 
    id: 'government', 
    name: 'Government / Public Sector', 
    icon: '🏛️',
    entityLabel: 'Number of Citizens / Cases',
    entityPlaceholder: 'e.g., 1000000',
    transactionLabel: 'Services per Day',
    transactionPlaceholder: 'e.g., 100000',
    defaultCompliance: ['iso27001', 'soc2'],
    standards: ['fedramp', 'fisma', 'fips']
  },
  { 
    id: 'telecom', 
    name: 'Telecom / Communications', 
    icon: '📡',
    entityLabel: 'Number of Subscribers',
    entityPlaceholder: 'e.g., 5000000',
    transactionLabel: 'CDRs / Events per Day',
    transactionPlaceholder: 'e.g., 100000000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: ['tcpa', 'fcc', 'calea']
  },
  { 
    id: 'pharma', 
    name: 'Pharma / Life Sciences', 
    icon: '💊',
    entityLabel: 'Number of Products / Trials',
    entityPlaceholder: 'e.g., 5000',
    transactionLabel: 'Records per Day',
    transactionPlaceholder: 'e.g., 100000',
    defaultCompliance: ['hipaa', 'soc2'],
    standards: ['fda21cfr', 'gxp', 'ich']
  },
  { 
    id: 'agriculture', 
    name: 'Agriculture / AgriTech', 
    icon: '🌾',
    entityLabel: 'Number of Farms / Sensors',
    entityPlaceholder: 'e.g., 50000',
    transactionLabel: 'Data Points per Day',
    transactionPlaceholder: 'e.g., 5000000',
    defaultCompliance: ['iso27001'],
    standards: ['globalgap', 'fsma']
  },
  { 
    id: 'hr', 
    name: 'HR / HRMS', 
    icon: '👔',
    entityLabel: 'Number of Employees',
    entityPlaceholder: 'e.g., 50000',
    transactionLabel: 'HR Transactions per Day',
    transactionPlaceholder: 'e.g., 10000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: []
  },
  { 
    id: 'travel', 
    name: 'Travel & Tourism', 
    icon: '✈️',
    entityLabel: 'Number of Bookings / Travelers',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: ['pci', 'gdpr'],
    standards: ['pci', 'iata']
  },
  { 
    id: 'media', 
    name: 'Media & Entertainment', 
    icon: '🎬',
    entityLabel: 'Number of Users / Subscribers',
    entityPlaceholder: 'e.g., 1000000',
    transactionLabel: 'Streams / Views per Day',
    transactionPlaceholder: 'e.g., 10000000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: ['coppa']
  },
  { 
    id: 'nonprofit', 
    name: 'Non-profit / NGO', 
    icon: '🤲',
    entityLabel: 'Number of Donors / Beneficiaries',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Donations / Activities per Day',
    transactionPlaceholder: 'e.g., 5000',
    defaultCompliance: ['gdpr', 'soc2'],
    standards: []
  },
  { 
    id: 'custom', 
    name: 'Custom Domain', 
    icon: '🔧',
    entityLabel: 'Number of Entities',
    entityPlaceholder: 'e.g., 100000',
    transactionLabel: 'Transactions per Day',
    transactionPlaceholder: 'e.g., 50000',
    defaultCompliance: [],
    standards: []
  },
];

const DATABASES = [
  { id: 'postgresql', name: 'PostgreSQL', type: 'Open Source' },
  { id: 'mysql', name: 'MySQL', type: 'Open Source' },
  { id: 'sqlserver', name: 'SQL Server', type: 'Commercial' },
  { id: 'oracle', name: 'Oracle', type: 'Commercial' },
  { id: 'mongodb', name: 'MongoDB', type: 'NoSQL' },
  { id: 'timescaledb', name: 'TimescaleDB', type: 'Time-Series' },
  { id: 'cassandra', name: 'Cassandra', type: 'Distributed' },
  { id: 'dynamodb', name: 'DynamoDB', type: 'AWS Managed' },
  { id: 'rds-postgresql', name: 'Amazon RDS (PostgreSQL)', type: 'AWS Managed' },
  { id: 'rds-mysql', name: 'Amazon RDS (MySQL)', type: 'AWS Managed' },
  { id: 'aurora', name: 'Amazon Aurora', type: 'AWS Managed' },
  { id: 'azure-sql', name: 'Azure SQL Database', type: 'Azure PaaS' },
  { id: 'azure-cosmos', name: 'Azure Cosmos DB', type: 'Azure PaaS' },
  { id: 'azure-adls', name: 'Azure ADLS Gen2', type: 'Data Lake' },
  { id: 'aws-s3', name: 'AWS S3', type: 'Object Storage' },
  { id: 'gcp-storage', name: 'GCP Cloud Storage', type: 'Object Storage' },
  { id: 'gcp-bigquery', name: 'GCP BigQuery', type: 'Data Warehouse' },
  { id: 'gcp-spanner', name: 'GCP Cloud Spanner', type: 'GCP Managed' },
  { id: 'snowflake', name: 'Snowflake', type: 'Data Warehouse' },
  { id: 'databricks', name: 'Databricks', type: 'Data Lake' },
];

const CLOUD_PROVIDERS = [
  { id: 'aws', name: 'AWS', icon: '☁️' },
  { id: 'azure', name: 'Azure', icon: '🔷' },
  { id: 'gcp', name: 'Google Cloud', icon: '🌐' },
];

const COMPLIANCE_OPTIONS = [
  { id: 'gdpr', name: 'GDPR (EU)', category: 'global' },
  { id: 'soc2', name: 'SOC 2', category: 'global' },
  { id: 'iso27001', name: 'ISO 27001', category: 'global' },
  { id: 'dpdp', name: 'DPDP (India)', category: 'global' },
  { id: 'hipaa', name: 'HIPAA', category: 'healthcare' },
  { id: 'pci', name: 'PCI-DSS', category: 'payment' },
  { id: 'iec62056', name: 'IEC 62056', category: 'ami' },
  { id: 'dlms', name: 'DLMS/COSEM', category: 'ami' },
  { id: 'ieee2030', name: 'IEEE 2030.5', category: 'ami' },
  { id: 'naesb', name: 'NAESB', category: 'utility' },
  { id: 'nerccip', name: 'NERC CIP', category: 'utility' },
  { id: 'sox', name: 'SOX', category: 'banking' },
  { id: 'glba', name: 'GLBA', category: 'banking' },
  { id: 'basel3', name: 'Basel III', category: 'banking' },
  { id: 'naic', name: 'NAIC', category: 'insurance' },
  { id: 'ifrs17', name: 'IFRS 17', category: 'insurance' },
  { id: 'hl7', name: 'HL7', category: 'healthcare' },
  { id: 'fhir', name: 'FHIR', category: 'healthcare' },
  { id: 'dicom', name: 'DICOM', category: 'healthcare' },
  { id: 'isa95', name: 'ISA-95', category: 'manufacturing' },
  { id: 'opcua', name: 'OPC-UA', category: 'manufacturing' },
  { id: 'tcpa', name: 'TCPA', category: 'telecom' },
  { id: 'fcc', name: 'FCC Regulations', category: 'telecom' },
  { id: 'aba', name: 'ABA Guidelines', category: 'legal' },
  { id: 'gaap', name: 'GAAP', category: 'accounting' },
  { id: 'ifrs', name: 'IFRS', category: 'accounting' },
  { id: 'iso9001', name: 'ISO 9001', category: 'erp' },
  { id: 'ferpa', name: 'FERPA', category: 'education' },
  { id: 'coppa', name: 'COPPA', category: 'education' },
  { id: 'iso28000', name: 'ISO 28000', category: 'logistics' },
  { id: 'ctpat', name: 'C-TPAT', category: 'logistics' },
  { id: 'fedramp', name: 'FedRAMP', category: 'government' },
  { id: 'fisma', name: 'FISMA', category: 'government' },
  { id: 'fips', name: 'FIPS', category: 'government' },
  { id: 'calea', name: 'CALEA', category: 'telecom' },
  { id: 'fda21cfr', name: 'FDA 21 CFR Part 11', category: 'pharma' },
  { id: 'gxp', name: 'GxP', category: 'pharma' },
  { id: 'ich', name: 'ICH Guidelines', category: 'pharma' },
  { id: 'globalgap', name: 'GLOBALG.A.P.', category: 'agriculture' },
  { id: 'fsma', name: 'FSMA', category: 'agriculture' },
  { id: 'iata', name: 'IATA Standards', category: 'travel' },
];

function getComplianceForDomain(domainId: string): typeof COMPLIANCE_OPTIONS {
  const domainConfig = DOMAINS.find(d => d.id === domainId);
  const domainStandards = domainConfig?.standards || [];
  
  const globalOptions = COMPLIANCE_OPTIONS.filter(opt => opt.category === 'global');
  const domainSpecificOptions = COMPLIANCE_OPTIONS.filter(opt => domainStandards.includes(opt.id));
  
  return [...globalOptions, ...domainSpecificOptions];
}

function calculateInfrastructure(deviceCount: number, readingsPerDay: number): InfraSpec {
  const dailyRecords = deviceCount * readingsPerDay;
  
  let tier: string;
  let compute: InfraSpec['compute'];
  let storage: InfraSpec['storage'];
  let network: InfraSpec['network'];
  
  if (dailyRecords < 1_000_000) {
    tier = 'Small';
    compute = { 
      appServers: 2, appServerVCPU: 2, appServerRAM: 8,
      dbPrimary: 1, dbReplicas: 0, dbVCPU: 2, dbRAM: 16,
      cacheNodes: 1, cacheRAM: 4,
      queueBrokers: 0, queueVCPU: 0, queueRAM: 0,
      totalCPU: 8, totalRAM: 36, totalRAMDisplay: '36 GB'
    };
    storage = { 
      databaseGB: 500, backupGB: 1000, logsGB: 100, totalGB: 1600,
      database: '500 GB', backup: '1 TB', logs: '100 GB', total: '~2 TB'
    };
    network = { 
      ingressMbps: 100, egressMbps: 100, internalGbps: 1, monthlyEgressGB: 500,
      ingress: '100 Mbps', egress: '100 Mbps', internal: '1 Gbps'
    };
  } else if (dailyRecords < 100_000_000) {
    tier = 'Medium';
    compute = { 
      appServers: 4, appServerVCPU: 4, appServerRAM: 8,
      dbPrimary: 1, dbReplicas: 2, dbVCPU: 8, dbRAM: 64,
      cacheNodes: 2, cacheRAM: 16,
      queueBrokers: 0, queueVCPU: 0, queueRAM: 0,
      totalCPU: 38, totalRAM: 200, totalRAMDisplay: '200 GB'
    };
    storage = { 
      databaseGB: 5000, backupGB: 15000, logsGB: 500, totalGB: 20500,
      database: '5 TB', backup: '15 TB', logs: '500 GB', total: '~25 TB'
    };
    network = { 
      ingressMbps: 500, egressMbps: 500, internalGbps: 10, monthlyEgressGB: 5000,
      ingress: '500 Mbps', egress: '500 Mbps', internal: '10 Gbps'
    };
  } else if (dailyRecords < 1_000_000_000) {
    tier = 'Large';
    compute = { 
      appServers: 8, appServerVCPU: 8, appServerRAM: 16,
      dbPrimary: 1, dbReplicas: 3, dbVCPU: 16, dbRAM: 128,
      cacheNodes: 6, cacheRAM: 32,
      queueBrokers: 3, queueVCPU: 8, queueRAM: 32,
      totalCPU: 170, totalRAM: 832, totalRAMDisplay: '832 GB'
    };
    storage = { 
      databaseGB: 50000, backupGB: 150000, logsGB: 2000, totalGB: 202000,
      database: '50 TB', backup: '150 TB', logs: '2 TB', total: '~250 TB'
    };
    network = { 
      ingressMbps: 2000, egressMbps: 2000, internalGbps: 25, monthlyEgressGB: 50000,
      ingress: '2 Gbps', egress: '2 Gbps', internal: '25 Gbps'
    };
  } else {
    tier = 'Massive';
    compute = { 
      appServers: 20, appServerVCPU: 16, appServerRAM: 32,
      dbPrimary: 3, dbReplicas: 9, dbVCPU: 16, dbRAM: 128,
      cacheNodes: 9, cacheRAM: 64,
      queueBrokers: 6, queueVCPU: 16, queueRAM: 64,
      totalCPU: 500, totalRAM: 2048, totalRAMDisplay: '2+ TB'
    };
    storage = { 
      databaseGB: 500000, backupGB: 1500000, logsGB: 10000, totalGB: 2010000,
      database: '500 TB', backup: '1.5 PB', logs: '10 TB', total: '~2.5 PB'
    };
    network = { 
      ingressMbps: 10000, egressMbps: 10000, internalGbps: 100, monthlyEgressGB: 500000,
      ingress: '10+ Gbps', egress: '10+ Gbps', internal: '100 Gbps'
    };
  }
  
  return {
    tier,
    dailyRecords: formatNumber(dailyRecords),
    dailyRecordsNum: dailyRecords,
    devices: formatNumber(deviceCount),
    devicesNum: deviceCount,
    compute,
    storage,
    network
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function getTechStackRecommendation(
  tier: string, 
  domainId: string = '', 
  deploymentType: 'cloud' | 'onprem' | 'hybrid' = 'cloud',
  cloudProvider: string = 'aws'
): TechStackRecommendation {
  const isStreamingDomain = ['ami', 'telecom', 'manufacturing', 'logistics', 'agriculture'].includes(domainId);
  const isTransactionalDomain = ['banking', 'insurance', 'retail', 'erp', 'accounting'].includes(domainId);
  const isAnalyticsDomain = ['ami', 'telecom', 'media', 'manufacturing', 'healthcare'].includes(domainId);
  const isIoTDomain = ['ami', 'manufacturing', 'agriculture', 'logistics'].includes(domainId);
  const isDataHeavyDomain = ['ami', 'telecom', 'media', 'healthcare', 'pharma'].includes(domainId);
  const isCloud = deploymentType === 'cloud';
  const isOnPrem = deploymentType === 'onprem';
  
  const cloudNativeServices = {
    aws: {
      serverless: 'AWS Lambda',
      queue: 'Amazon SQS / SNS',
      streaming: 'Amazon Kinesis',
      cache: 'Amazon ElastiCache',
      warehouse: 'Amazon Redshift',
      lake: 'AWS S3 + Glue',
      iot: 'AWS IoT Core',
      governance: 'AWS Glue Data Catalog'
    },
    azure: {
      serverless: 'Azure Functions',
      queue: 'Azure Service Bus',
      streaming: 'Azure Event Hubs',
      cache: 'Azure Cache for Redis',
      warehouse: 'Azure Synapse',
      lake: 'Azure Data Lake Gen2',
      iot: 'Azure IoT Hub',
      governance: 'Microsoft Purview'
    },
    gcp: {
      serverless: 'Cloud Functions',
      queue: 'Cloud Pub/Sub',
      streaming: 'Dataflow',
      cache: 'Memorystore',
      warehouse: 'BigQuery',
      lake: 'Cloud Storage + Dataproc',
      iot: 'Cloud Pub/Sub + IoT',
      governance: 'Data Catalog'
    }
  };
  
  const cloud = cloudNativeServices[cloudProvider as keyof typeof cloudNativeServices] || cloudNativeServices.aws;
  
  switch (tier) {
    case 'Small':
      const smallCloudDb = cloudProvider === 'aws' ? 'RDS PostgreSQL' : cloudProvider === 'azure' ? 'Azure Database for PostgreSQL' : 'Cloud SQL PostgreSQL';
      const smallCloudGateway = cloudProvider === 'aws' ? 'API Gateway' : cloudProvider === 'azure' ? 'Azure API Management' : 'Cloud Endpoints';
      const smallCloudWorkflow = cloudProvider === 'aws' ? 'Step Functions' : cloudProvider === 'azure' ? 'Logic Apps' : 'Cloud Workflows';
      return {
        tier,
        primaryDb: isCloud
          ? { name: smallCloudDb, description: 'Managed PostgreSQL with automatic backups' }
          : { name: 'PostgreSQL', description: 'Reliable RDBMS for transactional workloads' },
        analyticsDb: { name: 'Same DB (PostgreSQL)', description: 'Use same database for analytics queries' },
        queue: isCloud
          ? { name: cloud.queue, description: 'Managed queue service - no infrastructure to manage' }
          : { name: 'PostgreSQL Queue / Redis', description: 'Simple queue using DB or Redis pub/sub' },
        cache: isCloud
          ? { name: cloud.cache, description: 'Managed Redis-compatible cache service' }
          : { name: 'Redis', description: 'Single Redis instance for caching & sessions' },
        backend: isCloud
          ? { name: `${cloud.serverless} + ${smallCloudGateway}`, description: 'Serverless functions for cost-effective APIs' }
          : { name: 'Python + FastAPI', description: 'Fast, modern Python framework for APIs' },
        frontend: { name: 'React + Vite', description: 'Modern React with fast build tooling' },
        streaming: { name: 'Not Required', description: 'Small scale - batch processing sufficient' },
        etl: isCloud
          ? { name: `${cloud.serverless} + ${smallCloudWorkflow}`, description: 'Serverless ETL with workflow orchestration' }
          : { name: 'Python + Pandas', description: 'Simple ETL with Python scripts' },
        analytics: { name: 'Metabase', description: 'Open-source BI for dashboards & reports' },
        dataWarehouse: { name: 'PostgreSQL', description: 'Use primary database for warehousing at small scale' },
        dataLake: { name: 'Not Required', description: 'Small scale - structured storage sufficient' },
        dataIngestion: isIoTDomain
          ? (isCloud ? { name: cloud.iot, description: 'Managed IoT service for device connectivity' } : { name: 'MQTT + Python', description: 'MQTT broker with Python collectors for devices' })
          : { name: 'REST APIs + Batch', description: 'API-based data collection with batch imports' },
        dataGovernance: { name: 'Basic Docs', description: 'Simple documentation and naming conventions' }
      };
    case 'Medium':
      const mediumCloudDb = cloudProvider === 'aws' ? 'Amazon Aurora' : cloudProvider === 'azure' ? 'Azure SQL Database' : 'Cloud SQL';
      return {
        tier,
        primaryDb: isCloud
          ? { name: mediumCloudDb, description: 'Managed scalable database with auto-scaling' }
          : { name: 'TimescaleDB', description: 'Time-series optimized PostgreSQL for high-volume data' },
        analyticsDb: { name: 'PostgreSQL Views', description: 'Materialized views for reporting queries' },
        queue: isCloud
          ? { name: cloud.queue, description: 'Managed message queue with auto-scaling' }
          : { name: 'Redis Streams', description: 'Redis Streams for reliable message queuing' },
        cache: isCloud
          ? { name: cloud.cache, description: 'Managed distributed cache cluster' }
          : { name: 'Redis', description: 'Redis cluster for distributed caching' },
        backend: isCloud
          ? (isTransactionalDomain 
              ? { name: `Java + Spring Boot (${cloudProvider === 'aws' ? 'ECS' : cloudProvider === 'azure' ? 'Azure Container Apps' : 'Cloud Run'})`, description: 'Containerized enterprise framework' }
              : { name: `Node.js + ${cloud.serverless}`, description: 'Hybrid serverless architecture' })
          : (isTransactionalDomain 
              ? { name: 'Java + Spring Boot', description: 'Enterprise-grade framework for complex transactions' }
              : { name: 'Node.js + NestJS', description: 'TypeScript framework for scalable APIs' }),
        frontend: { name: 'React + Next.js', description: 'Full-stack React with SSR capabilities' },
        streaming: isCloud
          ? { name: cloud.streaming, description: 'Managed streaming for real-time data' }
          : (isStreamingDomain 
              ? { name: 'Apache Kafka', description: 'Distributed streaming for real-time data ingestion' }
              : { name: 'Redis Streams', description: 'Lightweight streaming with Redis' }),
        etl: isCloud
          ? { name: `${cloud.serverless} + ${cloudProvider === 'aws' ? 'AWS Glue' : cloudProvider === 'azure' ? 'Azure Data Factory' : 'Dataflow'}`, description: 'Serverless ETL with managed processing' }
          : { name: 'Apache Airflow', description: 'Workflow orchestration for data pipelines' },
        analytics: { name: 'Apache Superset', description: 'Enterprise BI with advanced visualizations' },
        dataWarehouse: isCloud
          ? { name: cloud.warehouse, description: 'Managed cloud data warehouse' }
          : (isDataHeavyDomain
              ? { name: 'ClickHouse', description: 'Column-store for fast analytical queries' }
              : { name: 'PostgreSQL + dbt', description: 'PostgreSQL with dbt for data transformations' }),
        dataLake: isCloud
          ? { name: cloud.lake, description: 'Managed data lake with catalog' }
          : { name: 'MinIO', description: 'Self-hosted S3-compatible object storage' },
        dataIngestion: isIoTDomain
          ? (isCloud ? { name: `${cloud.iot} + ${cloud.streaming}`, description: 'Managed IoT with streaming integration' } : { name: 'EMQX + Kafka Connect', description: 'MQTT broker with Kafka for device telemetry' })
          : (isCloud ? { name: 'Airbyte Cloud', description: 'Managed ELT connectors for data source integration' } : { name: 'Airbyte', description: 'Self-hosted ELT connectors for data source integration' }),
        dataGovernance: isCloud
          ? { name: cloud.governance, description: 'Managed data catalog with lineage' }
          : { name: 'Apache Atlas', description: 'Data catalog with lineage tracking' }
      };
    case 'Large':
      const largeCloudDb = cloudProvider === 'aws' ? 'Amazon Aurora' : cloudProvider === 'azure' ? 'Azure Cosmos DB' : 'Cloud Spanner';
      return {
        tier,
        primaryDb: isCloud
          ? { name: largeCloudDb, description: 'Globally distributed managed database' }
          : { name: 'TimescaleDB Cluster', description: 'Distributed TimescaleDB for massive time-series' },
        analyticsDb: isCloud
          ? { name: cloud.warehouse, description: 'Managed columnar analytics engine' }
          : { name: 'ClickHouse', description: 'Column-store OLAP database for fast analytics' },
        queue: isCloud
          ? { name: cloudProvider === 'aws' ? 'Amazon MSK' : cloudProvider === 'azure' ? 'Azure Event Hubs' : 'Confluent Cloud', description: 'Managed Kafka service' }
          : { name: 'Apache Kafka', description: 'Distributed streaming for high-throughput messaging' },
        cache: isCloud
          ? { name: cloud.cache + ' Cluster', description: 'Managed distributed cache cluster' }
          : { name: 'Redis Cluster', description: 'Redis Cluster for HA distributed caching' },
        backend: isCloud
          ? (isStreamingDomain
              ? { name: `Go + ${cloudProvider === 'aws' ? 'EKS' : cloudProvider === 'azure' ? 'AKS' : 'GKE'}`, description: 'Containerized Go on managed Kubernetes' }
              : isTransactionalDomain
                ? { name: `Java + Spring Boot (${cloudProvider === 'aws' ? 'EKS' : cloudProvider === 'azure' ? 'AKS' : 'GKE'})`, description: 'Enterprise Java on managed Kubernetes' }
                : { name: `Node.js + ${cloudProvider === 'aws' ? 'ECS' : cloudProvider === 'azure' ? 'Azure Container Apps' : 'Cloud Run'}`, description: 'Managed container services' })
          : (isStreamingDomain
              ? { name: 'Go + Fiber', description: 'High-performance Go for data ingestion services' }
              : isTransactionalDomain
                ? { name: 'Java + Spring Boot', description: 'Enterprise framework with transaction support' }
                : { name: 'Node.js + Fastify', description: 'High-performance Node.js framework' }),
        frontend: { name: 'React + Next.js + TanStack', description: 'Optimized React with advanced data fetching' },
        streaming: isCloud
          ? { name: `${cloud.streaming} + Flink (managed)`, description: 'Managed stream processing' }
          : { name: 'Apache Kafka + Flink', description: 'Stream processing with Apache Flink' },
        etl: isCloud
          ? { name: cloudProvider === 'aws' ? 'AWS Glue' : cloudProvider === 'azure' ? 'Azure Synapse' : 'Dataproc', description: 'Managed Spark for large-scale ETL' }
          : { name: 'Apache Spark', description: 'Distributed data processing for large datasets' },
        analytics: isAnalyticsDomain
          ? { name: 'ClickHouse + Grafana', description: 'Real-time analytics with custom dashboards' }
          : { name: 'Apache Superset + Cube.js', description: 'Semantic layer with BI visualization' },
        dataWarehouse: isCloud
          ? { name: cloud.warehouse, description: 'Enterprise cloud data warehouse' }
          : { name: 'ClickHouse Cluster', description: 'Self-hosted columnar warehouse for enterprise analytics' },
        dataLake: isCloud
          ? { name: cloud.lake + ' + Delta Lake', description: 'Managed lakehouse architecture' }
          : { name: 'Delta Lake + MinIO', description: 'Self-hosted lakehouse with ACID transactions' },
        dataIngestion: isIoTDomain
          ? (isCloud ? { name: `${cloud.iot} + ${cloud.streaming}`, description: 'Managed IoT with stream processing' } : { name: 'Apache NiFi + Kafka', description: 'Visual dataflow with Kafka for IoT ingestion' })
          : { name: 'Kafka Connect + Debezium', description: 'CDC and streaming connectors for real-time sync' },
        dataGovernance: isCloud
          ? { name: cloud.governance, description: 'Enterprise data governance platform' }
          : { name: 'Atlan / Collibra', description: 'Enterprise data catalog with governance policies' }
      };
    case 'Massive':
    default:
      const massiveCloudDb = cloudProvider === 'aws' ? 'Amazon DynamoDB' : cloudProvider === 'azure' ? 'Azure Cosmos DB' : 'Cloud Spanner';
      const massiveCloudEtl = cloudProvider === 'aws' ? 'EMR Spark' : cloudProvider === 'azure' ? 'Synapse Spark' : 'Dataproc Spark';
      const massiveCloudKafka = cloudProvider === 'aws' ? 'Amazon MSK' : cloudProvider === 'azure' ? 'Azure Event Hubs' : 'Confluent Cloud';
      return {
        tier,
        primaryDb: isCloud
          ? { name: massiveCloudDb, description: 'Planet-scale managed NoSQL' }
          : { name: 'Apache Cassandra', description: 'Distributed NoSQL for planet-scale writes' },
        analyticsDb: isCloud
          ? { name: `${cloud.warehouse} (Enterprise)`, description: 'Enterprise analytics with unlimited scale' }
          : { name: 'ClickHouse Cluster', description: 'Distributed ClickHouse for petabyte analytics' },
        queue: isCloud
          ? { name: `${massiveCloudKafka} (Enterprise)`, description: 'Enterprise-grade managed Kafka' }
          : { name: 'Kafka Cluster', description: 'Multi-broker Kafka for extreme throughput' },
        cache: isCloud
          ? { name: cloud.cache + ' Global', description: 'Geo-distributed managed cache' }
          : { name: 'Redis Cluster', description: 'Geo-distributed Redis Cluster' },
        backend: isCloud
          ? { name: 'Go + gRPC (Multi-region K8s)', description: 'Global microservices on managed Kubernetes' }
          : { name: 'Go + gRPC', description: 'High-performance microservices with gRPC' },
        frontend: { name: 'React + Micro-frontends', description: 'Distributed frontend architecture' },
        streaming: isCloud
          ? { name: `${massiveCloudKafka} + Flink (managed)`, description: 'Fully managed Lambda architecture' }
          : { name: 'Kafka + Flink + Spark Streaming', description: 'Lambda architecture for real-time + batch' },
        etl: isCloud
          ? { name: massiveCloudEtl, description: 'Enterprise managed Spark clusters' }
          : { name: 'Apache Spark Cluster', description: 'Distributed Spark for petabyte ETL' },
        analytics: isCloud
          ? { name: 'Databricks', description: 'Unified analytics platform' }
          : { name: 'Apache Superset + Trino', description: 'Self-hosted enterprise analytics platform' },
        dataWarehouse: isCloud
          ? { name: cloud.warehouse + ' (Enterprise)', description: 'Unified enterprise data platform' }
          : { name: 'Trino + ClickHouse', description: 'Self-hosted distributed query engine with columnar store' },
        dataLake: isCloud
          ? { name: cloud.lake + ' + Iceberg', description: 'Open table format on cloud storage' }
          : { name: 'Delta Lake + MinIO + Iceberg', description: 'Self-hosted multi-format lakehouse' },
        dataIngestion: isIoTDomain
          ? (isCloud ? { name: `${cloud.iot} + ${massiveCloudKafka} + Flink`, description: 'Global IoT with managed streaming' } : { name: 'Apache Pulsar + NiFi', description: 'Geo-replicated messaging for global IoT' })
          : { name: 'Kafka + Spark Structured Streaming', description: 'Unified batch and stream ingestion' },
        dataGovernance: isCloud
          ? { name: 'Unity Catalog + ' + cloud.governance, description: 'Enterprise governance with fine-grained access' }
          : { name: 'Apache Atlas + OpenMetadata', description: 'Self-hosted enterprise governance platform' }
      };
  }
}

function calculateCosts(infra: InfraSpec): Record<string, CostEstimate> {
  const HOURS_PER_MONTH = 730;
  
  const awsRates = {
    appVCPU: 0.042, appRAM: 0.0052,
    dbVCPU: 0.063, dbRAM: 0.0078,
    cacheRAM: 0.023,
    queueBroker: 0.21,
    storageGB: 0.08, backupGB: 0.023, logsGB: 0.05,
    egressGB: 0.09
  };
  
  const azureRates = {
    appVCPU: 0.038, appRAM: 0.0048,
    dbVCPU: 0.058, dbRAM: 0.0072,
    cacheRAM: 0.021,
    queueBroker: 0.19,
    storageGB: 0.075, backupGB: 0.02, logsGB: 0.045,
    egressGB: 0.087
  };
  
  const gcpRates = {
    appVCPU: 0.0335, appRAM: 0.0045,
    dbVCPU: 0.052, dbRAM: 0.0065,
    cacheRAM: 0.019,
    queueBroker: 0.17,
    storageGB: 0.07, backupGB: 0.018, logsGB: 0.04,
    egressGB: 0.085
  };
  
  function computeProviderCost(rates: typeof awsRates): CostEstimate {
    const appCompute = infra.compute.appServers * 
      (infra.compute.appServerVCPU * rates.appVCPU + infra.compute.appServerRAM * rates.appRAM) * HOURS_PER_MONTH;
    
    const dbNodes = infra.compute.dbPrimary + infra.compute.dbReplicas;
    const dbCompute = dbNodes * 
      (infra.compute.dbVCPU * rates.dbVCPU + infra.compute.dbRAM * rates.dbRAM) * HOURS_PER_MONTH;
    
    const cacheCompute = infra.compute.cacheNodes * infra.compute.cacheRAM * rates.cacheRAM * HOURS_PER_MONTH;
    
    const queueCompute = infra.compute.queueBrokers * rates.queueBroker * HOURS_PER_MONTH;
    
    const storageCost = (infra.storage.databaseGB * rates.storageGB) + 
      (infra.storage.backupGB * rates.backupGB) + 
      (infra.storage.logsGB * rates.logsGB);
    
    const networkCost = infra.network.monthlyEgressGB * rates.egressGB;
    
    const compute = Math.round(appCompute);
    const database = Math.round(dbCompute);
    const cache = Math.round(cacheCompute);
    const queue = Math.round(queueCompute);
    const storage = Math.round(storageCost);
    const network = Math.round(networkCost);
    const total = compute + database + cache + queue + storage + network;
    
    return { compute, storage, network, database, cache, queue, total, currency: 'USD' };
  }
  
  return {
    aws: computeProviderCost(awsRates),
    azure: computeProviderCost(azureRates),
    gcp: computeProviderCost(gcpRates)
  };
}

function generateArchitectureDiagram(infra: InfraSpec, db: string): string {
  if (infra.tier === 'Small') {
    return `
┌─────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER (ALB/NLB)                      │
│                              Port 443/80                             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  App Server 1 │         │  App Server 2 │         │  Auto-Scale   │
│   (Active)    │         │   (Active)    │         │   (Standby)   │
│   2 vCPU      │         │   2 vCPU      │         │               │
│   8 GB RAM    │         │   8 GB RAM    │         │               │
└───────┬───────┘         └───────┬───────┘         └───────────────┘
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│    Redis      │         │   ${db.toUpperCase().padEnd(10)}  │
│    Cache      │         │   Primary     │
│   4 GB RAM    │         │   16 GB RAM   │
└───────────────┘         └───────────────┘
`;
  } else if (infra.tier === 'Medium') {
    return `
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LOAD BALANCER (Multi-AZ)                      │
│                         Health Checks + SSL Termination                      │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬───────────────┐
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐
│ App 1 │       │ App 2 │       │ App 3 │       │ App 4 │       │ Auto  │
│4vCPU  │       │4vCPU  │       │4vCPU  │       │4vCPU  │       │ Scale │
│8GB    │       │8GB    │       │8GB    │       │8GB    │       │       │
└───┬───┘       └───┬───┘       └───┬───┘       └───┬───┘       └───────┘
    │               │               │               │
    └───────────────┴───────┬───────┴───────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
    ┌───────────────┐               ┌───────────────────────────────┐
    │ Redis Cluster │               │        ${db.toUpperCase()} CLUSTER         │
    │   Primary +   │               │  ┌─────────┐    ┌──────────┐  │
    │   Replica     │               │  │ Primary │───▶│ Replica1 │  │
    │   32 GB       │               │  │ 64GB    │    │ 32GB     │  │
    └───────────────┘               │  └────┬────┘    └──────────┘  │
                                    │       │         ┌──────────┐  │
                                    │       └────────▶│ Replica2 │  │
                                    │                 │ 32GB     │  │
                                    └─────────────────┴──────────┴──┘
`;
  } else {
    return `
┌────────────────────────────────────────────────────────────────────────────────────┐
│                      GLOBAL LOAD BALANCER (Multi-Region / CDN)                      │
│                    Auto-Failover • DDoS Protection • WAF Enabled                    │
└──────────────────────────────────────┬─────────────────────────────────────────────┘
                                       │
    ┌──────────────────────────────────┴──────────────────────────────────┐
    │                    KUBERNETES / EKS / AKS / GKE                      │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ...   │
    │  │ Pod 1-8 │ │ Pod 9+  │ │ Worker  │ │ Worker  │ │ Auto    │       │
    │  │ API Svc │ │ API Svc │ │ Batch   │ │ Stream  │ │ Scale   │       │
    │  │16vCPU   │ │16vCPU   │ │ 8vCPU   │ │ 8vCPU   │ │ HPA/VPA │       │
    │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘       │
    └───────┼──────────┼──────────┼──────────┼───────────────────────────┘
            │          │          │          │
            └──────────┴──────┬───┴──────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
     ▼                        ▼                        ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐
│ KAFKA CLUSTER│      │ REDIS CLUSTER│      │  DATABASE CLUSTER        │
│ 3-6 Brokers  │      │ 6 Nodes      │      │  ┌───────┐  ┌───────┐   │
│ Replication  │      │ Sharded      │      │  │Primary│─▶│Replica│   │
│ Factor: 3    │      │ 192 GB Total │      │  │128GB  │  │ x3    │   │
└──────────────┘      └──────────────┘      │  └───────┘  └───────┘   │
                                            │  ${db.toUpperCase()} + TimescaleDB     │
     ┌──────────────────────────────────────┴─────────────────────────┐
     │                     ANALYTICS LAYER                             │
     │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
     │  │ ClickHouse  │   │ Elastic     │   │ Data Lake   │           │
     │  │ OLAP Engine │   │ Search      │   │ (S3/Blob)   │           │
     │  └─────────────┘   └─────────────┘   └─────────────┘           │
     └────────────────────────────────────────────────────────────────┘
`;
  }
}

function getSecurityRequirements(compliance: string[]): SecurityReq[] {
  const reqs: SecurityReq[] = [
    { name: 'TLS 1.3 Encryption', description: 'All data in transit encrypted', status: 'included' },
    { name: 'AES-256 at Rest', description: 'Database and storage encryption', status: 'included' },
    { name: 'Multi-Factor Auth', description: 'Admin and user authentication', status: 'included' },
    { name: 'Role-Based Access', description: 'RBAC with fine-grained permissions', status: 'included' },
    { name: 'Audit Logging', description: 'Complete audit trail for all actions', status: 'included' },
    { name: 'Network Isolation', description: 'VPC with private subnets', status: 'included' },
  ];
  
  if (compliance.includes('hipaa')) {
    reqs.push(
      { name: 'PHI Data Handling', description: 'HIPAA-compliant data storage', status: 'required' },
      { name: 'BAA Required', description: 'Business Associate Agreement with cloud provider', status: 'required' },
      { name: 'Access Logging', description: 'All PHI access must be logged', status: 'required' }
    );
  }
  
  if (compliance.includes('gdpr')) {
    reqs.push(
      { name: 'Data Residency', description: 'EU data stays in EU region', status: 'required' },
      { name: 'Right to Erasure', description: 'Complete data deletion capability', status: 'required' },
      { name: 'Consent Management', description: 'User consent tracking system', status: 'required' }
    );
  }
  
  if (compliance.includes('pci')) {
    reqs.push(
      { name: 'PCI DSS Scope', description: 'Cardholder data environment isolation', status: 'required' },
      { name: 'Tokenization', description: 'Card data tokenization required', status: 'required' },
      { name: 'Quarterly Scans', description: 'ASV scanning required', status: 'required' }
    );
  }
  
  if (compliance.includes('soc2')) {
    reqs.push(
      { name: 'Continuous Monitoring', description: 'Real-time security monitoring', status: 'recommended' },
      { name: 'Incident Response', description: 'Documented IR procedures', status: 'recommended' }
    );
  }
  
  if (compliance.includes('dpdp')) {
    reqs.push(
      { name: 'Data Localization', description: 'Data must reside within India', status: 'required' },
      { name: 'Consent Framework', description: 'Purpose-limited consent collection', status: 'required' },
      { name: 'Data Principal Rights', description: 'Right to access, correction, erasure', status: 'required' },
      { name: 'Breach Notification', description: '72-hour breach notification to DPBI', status: 'required' },
      { name: 'Data Fiduciary Audit', description: 'Annual compliance audit required', status: 'recommended' }
    );
  }
  
  if (compliance.includes('iso27001')) {
    reqs.push(
      { name: 'ISMS Implementation', description: 'Information Security Management System', status: 'required' },
      { name: 'Risk Assessment', description: 'Formal risk assessment process', status: 'required' },
      { name: 'Asset Management', description: 'Information asset inventory', status: 'recommended' },
      { name: 'Access Control Policy', description: 'Documented access control procedures', status: 'recommended' },
      { name: 'Security Training', description: 'Regular security awareness training', status: 'recommended' }
    );
  }
  
  return reqs;
}

interface HardwareRecommendation {
  component: string;
  count: number;
  awsInstance: string;
  azureInstance: string;
  gcpInstance: string;
  specs: string;
}

function getHardwareRecommendations(infra: InfraSpec): HardwareRecommendation[] {
  const recommendations: HardwareRecommendation[] = [];
  
  const appInstances: Record<string, { aws: string; azure: string; gcp: string }> = {
    '2-8': { aws: 't3.large', azure: 'Standard_D2s_v3', gcp: 'e2-standard-2' },
    '4-8': { aws: 'm5.xlarge', azure: 'Standard_D4s_v3', gcp: 'e2-standard-4' },
    '8-16': { aws: 'm5.2xlarge', azure: 'Standard_D8s_v3', gcp: 'e2-standard-8' },
    '16-32': { aws: 'm5.4xlarge', azure: 'Standard_D16s_v3', gcp: 'e2-standard-16' },
  };
  
  const dbInstances: Record<string, { aws: string; azure: string; gcp: string }> = {
    '2-16': { aws: 'db.t3.xlarge', azure: 'GP_Gen5_2', gcp: 'db-custom-2-16384' },
    '8-64': { aws: 'db.r5.2xlarge', azure: 'GP_Gen5_8', gcp: 'db-custom-8-65536' },
    '16-128': { aws: 'db.r5.4xlarge', azure: 'MO_Gen5_16', gcp: 'db-custom-16-131072' },
  };
  
  const cacheInstances: Record<number, { aws: string; azure: string; gcp: string }> = {
    4: { aws: 'cache.r5.large', azure: 'C3 Standard', gcp: 'M1 (4GB)' },
    16: { aws: 'cache.r5.xlarge', azure: 'P2 Premium', gcp: 'M2 (16GB)' },
    32: { aws: 'cache.r5.2xlarge', azure: 'P3 Premium', gcp: 'M3 (32GB)' },
    64: { aws: 'cache.r5.4xlarge', azure: 'P4 Premium', gcp: 'M4 (64GB)' },
  };
  
  const appKey = `${infra.compute.appServerVCPU}-${infra.compute.appServerRAM}`;
  const appInst = appInstances[appKey] || appInstances['4-8'];
  recommendations.push({
    component: 'App Servers',
    count: infra.compute.appServers,
    awsInstance: appInst.aws,
    azureInstance: appInst.azure,
    gcpInstance: appInst.gcp,
    specs: `${infra.compute.appServerVCPU} vCPU, ${infra.compute.appServerRAM} GB RAM`
  });
  
  const dbKey = `${infra.compute.dbVCPU}-${infra.compute.dbRAM}`;
  const dbInst = dbInstances[dbKey] || dbInstances['8-64'];
  recommendations.push({
    component: 'Database Primary',
    count: infra.compute.dbPrimary,
    awsInstance: dbInst.aws,
    azureInstance: dbInst.azure,
    gcpInstance: dbInst.gcp,
    specs: `${infra.compute.dbVCPU} vCPU, ${infra.compute.dbRAM} GB RAM`
  });
  
  if (infra.compute.dbReplicas > 0) {
    recommendations.push({
      component: 'Database Replicas',
      count: infra.compute.dbReplicas,
      awsInstance: dbInst.aws,
      azureInstance: dbInst.azure,
      gcpInstance: dbInst.gcp,
      specs: `${infra.compute.dbVCPU} vCPU, ${infra.compute.dbRAM} GB RAM (Read-only)`
    });
  }
  
  if (infra.compute.cacheNodes > 0) {
    const cacheInst = cacheInstances[infra.compute.cacheRAM] || cacheInstances[16];
    recommendations.push({
      component: 'Redis Cache',
      count: infra.compute.cacheNodes,
      awsInstance: cacheInst.aws,
      azureInstance: cacheInst.azure,
      gcpInstance: cacheInst.gcp,
      specs: `${infra.compute.cacheRAM} GB RAM per node`
    });
  }
  
  if (infra.compute.queueBrokers > 0) {
    recommendations.push({
      component: 'Message Queue',
      count: infra.compute.queueBrokers,
      awsInstance: 'mq.m5.large / MSK',
      azureInstance: 'Service Bus Premium',
      gcpInstance: 'Cloud Pub/Sub',
      specs: `${infra.compute.queueVCPU} vCPU, ${infra.compute.queueRAM} GB RAM`
    });
  }
  
  return recommendations;
}

function getClusterConfig(infra: InfraSpec): ClusterConfig {
  const tierConfigs: Record<string, ClusterConfig> = {
    'Small': {
      appCluster: { nodes: 2, loadBalancer: 'Application LB', autoScaling: true, minNodes: 2, maxNodes: 4 },
      dbCluster: { type: 'Primary-Standby', primaryNodes: 1, replicaNodes: 1, sharding: false, replicationMode: 'Sync' }
    },
    'Medium': {
      appCluster: { nodes: 4, loadBalancer: 'Network LB + ALB', autoScaling: true, minNodes: 3, maxNodes: 8 },
      dbCluster: { type: 'Multi-AZ Cluster', primaryNodes: 1, replicaNodes: 2, sharding: false, replicationMode: 'Async' }
    },
    'Large': {
      appCluster: { nodes: 8, loadBalancer: 'Global LB + WAF', autoScaling: true, minNodes: 6, maxNodes: 20 },
      dbCluster: { type: 'Sharded Cluster', primaryNodes: 3, replicaNodes: 6, sharding: true, replicationMode: 'Multi-Master' }
    },
    'Massive': {
      appCluster: { nodes: 20, loadBalancer: 'Multi-Region Global LB', autoScaling: true, minNodes: 15, maxNodes: 100 },
      dbCluster: { type: 'Geo-Distributed', primaryNodes: 6, replicaNodes: 12, sharding: true, replicationMode: 'Active-Active' }
    }
  };
  
  return tierConfigs[infra.tier] || tierConfigs['Small'];
}

export default function App() {
  const [requirements, setRequirements] = useState("");
  const [domain, setDomain] = useState("ami");
  const [deviceCount, setDeviceCount] = useState("100000");
  const [readingsPerDay, setReadingsPerDay] = useState("96");
  const [selectedDb, setSelectedDb] = useState("postgresql");
  const [selectedCloud, setSelectedCloud] = useState("aws");
  const [compliance, setCompliance] = useState<string[]>([]);
  const [deploymentType, setDeploymentType] = useState<'cloud' | 'onprem' | 'hybrid'>('cloud');
  const [mobileApps, setMobileApps] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedArtifacts, setGeneratedArtifacts] = useState<GeneratedArtifacts | null>(null);
  const [generatingArtifacts, setGeneratingArtifacts] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState<'unknown' | 'connected' | 'mock' | 'error'>('unknown');
  const [specPhase, setSpecPhase] = useState<'configure' | 'preview' | 'finalize'>('configure');
  
  const [multiTenantEnabled, setMultiTenantEnabled] = useState(false);
  const [multiTenantLevel, setMultiTenantLevel] = useState<'ui-only' | 'ui-and-db'>('ui-and-db');
  const [multiLingualEnabled, setMultiLingualEnabled] = useState(false);
  const [multiLingualLevel, setMultiLingualLevel] = useState<'ui-only' | 'ui-and-db'>('ui-only');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);

  const [cicdEnabled, setCicdEnabled] = useState(false);
  const [cicdProvider, setCicdProvider] = useState<'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops' | 'circleci'>('github-actions');
  const [apiGatewayEnabled, setApiGatewayEnabled] = useState(false);
  const [apiGatewayProvider, setApiGatewayProvider] = useState<'kong' | 'aws-api-gateway' | 'azure-apim' | 'nginx' | 'envoy'>('kong');
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [monitoringStack, setMonitoringStack] = useState<'prometheus-grafana' | 'elk' | 'datadog' | 'newrelic' | 'cloudwatch'>('prometheus-grafana');
  const [backupDREnabled, setBackupDREnabled] = useState(false);
  const [backupDRStrategy, setBackupDRStrategy] = useState<'hot-standby' | 'warm-standby' | 'cold-backup' | 'pilot-light'>('warm-standby');
  const [environmentsEnabled, setEnvironmentsEnabled] = useState(true);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(['dev', 'staging', 'prod']);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState<string[]>(['email']);
  const [documentationEnabled, setDocumentationEnabled] = useState(false);
  const [documentationTypes, setDocumentationTypes] = useState<string[]>(['api', 'user-guide']);
  const [performanceSLAEnabled, setPerformanceSLAEnabled] = useState(false);
  const [dataMigrationEnabled, setDataMigrationEnabled] = useState(false);
  const [dataMigrationStrategy, setDataMigrationStrategy] = useState<'big-bang' | 'phased' | 'parallel-run' | 'strangler'>('phased');
  const [versionControlEnabled, setVersionControlEnabled] = useState(true);
  const [versionControlStrategy, setVersionControlStrategy] = useState<'gitflow' | 'github-flow' | 'trunk-based' | 'feature-branch'>('github-flow');

  const [savedWorkspaces, setSavedWorkspaces] = useState<SavedWorkspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [diagramView, setDiagramView] = useState<'visual' | 'ascii'>('visual');
  const [generatingMobileApp, setGeneratingMobileApp] = useState(false);
  const [mobileAppResult, setMobileAppResult] = useState<any>(null);
  const [generatingBackendApi, setGeneratingBackendApi] = useState(false);
  const [backendApiResult, setBackendApiResult] = useState<any>(null);
  const [backendFramework, setBackendFramework] = useState<'nodejs' | 'python' | 'go'>('nodejs');
  const [viewMode, setViewMode] = useState<'dashboard' | 'wizard'>('dashboard');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Category navigation state for reorganized UI
  const [activeCategory, setActiveCategory] = useState<string>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['infra-specs', 'hardware', 'cost-comparison']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const RESULT_CATEGORIES = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'architecture', label: 'Architecture', icon: '🏗️' },
    { id: 'build', label: 'Build & Code', icon: '🔧' },
    { id: 'testing', label: 'Testing', icon: '🧪' },
    { id: 'operations', label: 'Operations', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
  ];

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/workspaces?sessionId=${getSessionId()}`);
      if (response.ok) {
        const data = await response.json();
        setSavedWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
    setLoadingWorkspaces(false);
  };

  const saveWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setSavingWorkspace(true);
    
    const workspaceData = {
      name: workspaceName,
      sessionId: getSessionId(),
      domain,
      database: selectedDb,
      entityCount: deviceCount,
      transactionsPerDay: readingsPerDay,
      compliance,
      deploymentType,
      multiTenant: { enabled: multiTenantEnabled, level: multiTenantLevel },
      multiLingual: { enabled: multiLingualEnabled, level: multiLingualLevel, languages: selectedLanguages },
      crossDomain: {
        cicd: { enabled: cicdEnabled, provider: cicdProvider },
        apiGateway: { enabled: apiGatewayEnabled, provider: apiGatewayProvider },
        monitoring: { enabled: monitoringEnabled, stack: monitoringStack },
        backupDR: { enabled: backupDREnabled, strategy: backupDRStrategy },
        environments: { enabled: environmentsEnabled, environments: selectedEnvironments },
        notifications: { enabled: notificationsEnabled, channels: notificationChannels },
        documentation: { enabled: documentationEnabled, types: documentationTypes },
        performanceSLA: { enabled: performanceSLAEnabled },
        dataMigration: { enabled: dataMigrationEnabled, strategy: dataMigrationStrategy },
        versionControl: { enabled: versionControlEnabled, strategy: versionControlStrategy }
      },
      modules: generatedArtifacts?.modules,
      screens: generatedArtifacts?.screens,
      tables: generatedArtifacts?.tables,
      tests: generatedArtifacts?.tests,
      integrations: generatedArtifacts?.integrations,
      scaffolding: generatedArtifacts?.scaffolding,
      infrastructure: result?.infrastructure,
      costs: result?.costs,
      security: result?.security,
      clusterConfig: result?.clusterConfig,
      mobileConfig: result?.mobileConfig,
      status: specPhase === 'finalize' ? 'ready' : 'draft'
    };

    try {
      const method = currentWorkspaceId ? 'PUT' : 'POST';
      const url = currentWorkspaceId 
        ? `${API_BASE_URL}/api/workspaces/${currentWorkspaceId}` 
        : `${API_BASE_URL}/api/workspaces`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentWorkspaceId(data.workspace.id);
        setShowWorkspaceModal(false);
        await loadWorkspaces();
      }
    } catch (err) {
      console.error('Failed to save workspace:', err);
    }
    setSavingWorkspace(false);
  };

  const loadWorkspace = async (workspaceId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        const ws = data.workspace;
        
        setWorkspaceName(ws.name);
        setCurrentWorkspaceId(ws.id);
        setDomain(ws.domain || 'ami');
        setSelectedDb(ws.database || 'postgresql');
        setDeviceCount(ws.entityCount || '100000');
        setReadingsPerDay(ws.transactionsPerDay || '96');
        setCompliance(ws.compliance || []);
        setDeploymentType(ws.deploymentType || 'cloud');
        
        if (ws.multiTenant) {
          setMultiTenantEnabled(ws.multiTenant.enabled || false);
          setMultiTenantLevel(ws.multiTenant.level || 'ui-and-db');
        }
        if (ws.multiLingual) {
          setMultiLingualEnabled(ws.multiLingual.enabled || false);
          setMultiLingualLevel(ws.multiLingual.level || 'ui-only');
          setSelectedLanguages(ws.multiLingual.languages || ['en']);
        }
        if (ws.crossDomain) {
          const cd = ws.crossDomain;
          if (cd.cicd) { setCicdEnabled(cd.cicd.enabled); setCicdProvider(cd.cicd.provider || 'github-actions'); }
          if (cd.apiGateway) { setApiGatewayEnabled(cd.apiGateway.enabled); setApiGatewayProvider(cd.apiGateway.provider || 'kong'); }
          if (cd.monitoring) { setMonitoringEnabled(cd.monitoring.enabled); setMonitoringStack(cd.monitoring.stack || 'prometheus-grafana'); }
          if (cd.backupDR) { setBackupDREnabled(cd.backupDR.enabled); setBackupDRStrategy(cd.backupDR.strategy || 'warm-standby'); }
          if (cd.environments) { setEnvironmentsEnabled(cd.environments.enabled); setSelectedEnvironments(cd.environments.environments || ['dev', 'staging', 'prod']); }
          if (cd.notifications) { setNotificationsEnabled(cd.notifications.enabled); setNotificationChannels(cd.notifications.channels || ['email']); }
          if (cd.documentation) { setDocumentationEnabled(cd.documentation.enabled); setDocumentationTypes(cd.documentation.types || ['api', 'user-guide']); }
          if (cd.performanceSLA) { setPerformanceSLAEnabled(cd.performanceSLA.enabled); }
          if (cd.dataMigration) { setDataMigrationEnabled(cd.dataMigration.enabled); setDataMigrationStrategy(cd.dataMigration.strategy || 'phased'); }
          if (cd.versionControl) { setVersionControlEnabled(cd.versionControl.enabled); setVersionControlStrategy(cd.versionControl.strategy || 'github-flow'); }
        }
        
        if (ws.modules || ws.screens || ws.tables || ws.tests) {
          setGeneratedArtifacts({
            modules: ws.modules || [],
            screens: ws.screens || [],
            tables: ws.tables || [],
            tests: ws.tests || [],
            integrations: ws.integrations || [],
            scaffolding: ws.scaffolding || { folders: [], files: [] },
            multiTenant: ws.multiTenant || { enabled: false, level: 'ui-and-db', isolation: 'row-level' },
            multiLingual: ws.multiLingual || { enabled: false, level: 'ui-only', defaultLanguage: 'en', supportedLanguages: ['en'] },
            crossDomain: generatedArtifacts?.crossDomain || {} as any
          });
          setSpecPhase('preview');
        }
        
        if (ws.infrastructure) {
          setResult({
            domain: DOMAINS.find(d => d.id === ws.domain)?.name || ws.domain,
            infrastructure: ws.infrastructure,
            architecture: '',
            costs: ws.costs || {},
            security: ws.security || [],
            clusterConfig: ws.clusterConfig || { appCluster: {} as any, dbCluster: {} as any },
            mobileConfig: ws.mobileConfig || { platform: [], framework: '', features: [] },
            deploymentFormats: []
          });
        }
        
        setShowWorkspaceModal(false);
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  const deleteWorkspace = async (workspaceId: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}?sessionId=${getSessionId()}`, { method: 'DELETE' });
      if (currentWorkspaceId === workspaceId) {
        setCurrentWorkspaceId(null);
        setWorkspaceName('');
      }
      await loadWorkspaces();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const startNewWorkspace = () => {
    setCurrentWorkspaceId(null);
    setWorkspaceName('');
    setRequirements('');
    setDomain('ami');
    setDeviceCount('100000');
    setReadingsPerDay('96');
    setSelectedDb('postgresql');
    setCompliance([]);
    setDeploymentType('cloud');
    setMultiTenantEnabled(false);
    setMultiLingualEnabled(false);
    setSelectedLanguages(['en']);
    setCicdEnabled(false);
    setApiGatewayEnabled(false);
    setMonitoringEnabled(false);
    setBackupDREnabled(false);
    setEnvironmentsEnabled(true);
    setSelectedEnvironments(['dev', 'staging', 'prod']);
    setNotificationsEnabled(false);
    setDocumentationEnabled(false);
    setPerformanceSLAEnabled(false);
    setDataMigrationEnabled(false);
    setVersionControlEnabled(true);
    setGeneratedArtifacts(null);
    setResult(null);
    setSpecPhase('configure');
  };

  const handleComplianceToggle = (id: string) => {
    setCompliance(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleMobileToggle = (platform: string) => {
    setMobileApps(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleEnvironmentToggle = (env: string) => {
    setSelectedEnvironments(prev =>
      prev.includes(env) ? prev.filter(e => e !== env) : [...prev, env]
    );
  };

  const handleNotificationChannelToggle = (channel: string) => {
    setNotificationChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handleDocTypeToggle = (docType: string) => {
    setDocumentationTypes(prev =>
      prev.includes(docType) ? prev.filter(d => d !== docType) : [...prev, docType]
    );
  };

  const generateCodeArtifacts = async () => {
    setGeneratingArtifacts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'all',
          domain,
          entityCount: parseInt(deviceCount) || 100000,
          transactionsPerDay: parseInt(readingsPerDay) || 96,
          database: selectedDb,
          compliance,
          deploymentType,
          multiTenant: { enabled: multiTenantEnabled, level: multiTenantLevel },
          multiLingual: { enabled: multiLingualEnabled, level: multiLingualLevel, languages: selectedLanguages }
        })
      });
      
      if (!response.ok) throw new Error('AI service unavailable');
      
      const data = await response.json();
      if (data.ok) {
        const artifacts = data.data || data;
        setGeneratedArtifacts({
          modules: artifacts.modules || [],
          screens: artifacts.screens || [],
          tables: artifacts.tables || [],
          tests: artifacts.tests || [],
          integrations: artifacts.integrations || [],
          scaffolding: artifacts.scaffolding || { folders: [], files: [] },
          multiTenant: artifacts.multiTenant || { enabled: multiTenantEnabled, level: multiTenantLevel, isolation: 'row-level' },
          multiLingual: artifacts.multiLingual || { enabled: multiLingualEnabled, level: multiLingualLevel, defaultLanguage: 'en', supportedLanguages: selectedLanguages },
          crossDomain: {
            cicd: { enabled: cicdEnabled, provider: cicdProvider, features: ['Build automation', 'Test automation', 'Deploy automation', 'Artifact storage'] },
            apiGateway: { enabled: apiGatewayEnabled, provider: apiGatewayProvider, features: ['Rate limiting', 'API versioning', 'Request/Response transformation', 'Authentication'] },
            monitoring: { enabled: monitoringEnabled, stack: monitoringStack, features: ['Metrics collection', 'Log aggregation', 'Alerting', 'Dashboards'] },
            backupDR: { enabled: backupDREnabled, rpoHours: 4, rtoHours: 1, strategy: backupDRStrategy, features: ['Automated backups', 'Point-in-time recovery', 'Cross-region replication', 'Failover testing'] },
            environments: { enabled: environmentsEnabled, environments: selectedEnvironments, promotionStrategy: 'gitops', features: ['Environment isolation', 'Config management', 'Secrets management'] },
            notifications: { enabled: notificationsEnabled, channels: notificationChannels, features: ['Alert routing', 'Escalation policies', 'On-call scheduling'] },
            documentation: { enabled: documentationEnabled, types: documentationTypes, features: ['Auto-generated API docs', 'Code documentation', 'User guides'] },
            performanceSLA: { enabled: performanceSLAEnabled, latencyP99Ms: 200, uptimePercent: 99.9, features: ['Load testing', 'Stress testing', 'Performance benchmarks'] },
            dataMigration: { enabled: dataMigrationEnabled, strategy: dataMigrationStrategy, features: ['Schema migration', 'Data validation', 'Rollback support', 'Zero-downtime migration'] },
            versionControl: { enabled: versionControlEnabled, strategy: versionControlStrategy, features: ['Branch protection', 'Code review', 'CI integration', 'Release management'] }
          }
        });
        setAiServiceStatus('connected');
        setSpecPhase('preview');
      }
    } catch (err) {
      console.error('Failed to generate artifacts:', err);
      setAiServiceStatus('error');
    }
    setGeneratingArtifacts(false);
  };

  const generateMobileAppCode = async () => {
    if (mobileApps.length === 0) {
      alert('Please select at least one mobile platform (iOS, Android, or PWA)');
      return;
    }
    
    setGeneratingMobileApp(true);
    setMobileAppResult(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-mobile-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          projectName: `${domain.charAt(0).toUpperCase() + domain.slice(1)}App`,
          platforms: mobileApps,
          features: ['Offline Support', 'Push Notifications', 'Biometric Auth'],
          modules: generatedArtifacts?.modules || [],
          screens: generatedArtifacts?.screens || [],
          tables: generatedArtifacts?.tables || [],
          framework: 'expo',
          authentication: true,
          offlineSync: true,
          pushNotifications: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate mobile app');
      
      const data = await response.json();
      if (data.ok) {
        setMobileAppResult(data);
      }
    } catch (err) {
      console.error('Failed to generate mobile app:', err);
      alert('Failed to generate mobile app. Please try again.');
    }
    setGeneratingMobileApp(false);
  };

  const downloadMobileAppFiles = () => {
    if (!mobileAppResult?.files) return;
    
    const content = mobileAppResult.files.map((file: any) => 
      `// ============================================\n// FILE: ${file.path}\n// ${file.description}\n// ============================================\n\n${file.content}\n\n`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-mobile-app-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateBackendApiCode = async () => {
    if (!generatedArtifacts?.tables || generatedArtifacts.tables.length === 0) {
      alert('Please generate code specifications first to get database tables.');
      return;
    }
    
    setGeneratingBackendApi(true);
    setBackendApiResult(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework: backendFramework,
          domain,
          database: selectedDb,
          projectName: `${domain.toLowerCase().replace(/\s+/g, '-')}-api`,
          tables: generatedArtifacts.tables.map((t: any) => ({
            name: t.name,
            columns: t.columns || []
          })),
          authentication: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate backend API');
      
      const data = await response.json();
      if (data.ok) {
        setBackendApiResult(data);
      }
    } catch (err) {
      console.error('Failed to generate backend API:', err);
      alert('Failed to generate backend API. Please try again.');
    }
    setGeneratingBackendApi(false);
  };

  const downloadBackendApiFiles = () => {
    if (!backendApiResult?.files) return;
    
    const content = backendApiResult.files.map((file: any) => {
      const ext = file.path.split('.').pop() || '';
      const commentPrefix = ['py'].includes(ext) ? '#' : '//';
      return `${commentPrefix} ============================================\n${commentPrefix} FILE: ${file.path}\n${commentPrefix} ${file.description}\n${commentPrefix} ============================================\n\n${file.content}\n\n`;
    }).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-${backendFramework}-api-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLanguageToggle = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const analyzeRequirements = async () => {
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const devices = parseInt(deviceCount) || 100000;
    const readings = parseInt(readingsPerDay) || 96;
    
    const infrastructure = calculateInfrastructure(devices, readings);
    const costs = calculateCosts(infrastructure);
    const architecture = generateArchitectureDiagram(infrastructure, selectedDb);
    const security = getSecurityRequirements(compliance);
    const clusterConfig = getClusterConfig(infrastructure);
    
    const techStack = getTechStackRecommendation(infrastructure.tier, domain, deploymentType, selectedCloud);
    
    const analysisResult: AnalysisResult = {
      domain: DOMAINS.find(d => d.id === domain)?.name || domain,
      infrastructure,
      architecture,
      costs,
      security,
      clusterConfig,
      mobileConfig: {
        platform: mobileApps,
        framework: mobileApps.length === 0 
          ? 'None selected' 
          : mobileApps.length > 1 
            ? 'React Native (Cross-platform)' 
            : mobileApps[0] === 'ios' 
              ? 'Swift (Native iOS)' 
              : mobileApps[0] === 'android'
                ? 'Kotlin (Native Android)'
                : 'PWA (Web Technologies)',
        features: mobileApps.length > 0 
          ? ['Offline Sync', 'Push Notifications', 'Biometric Auth', 'Real-time Updates']
          : []
      },
      deploymentFormats: deploymentType === 'cloud' 
        ? ['Docker', 'Kubernetes Helm', 'Terraform'] 
        : deploymentType === 'onprem'
        ? ['Docker Compose', 'VM Images (OVA)', 'Ansible Playbooks', 'Air-Gapped Bundle']
        : ['Docker', 'Kubernetes', 'VPN Gateway', 'Edge Sync Agent'],
      techStack
    };
    
    setResult(analysisResult);
    setLoading(false);
  };

  return (
    <div className="platform-launcher">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>Intelligent Platform Launcher</h1>
            <p>Domain-agnostic • Database-agnostic • Multi-Cloud • On-Prem Ready</p>
          </div>
          <div className="workspace-controls">
            {currentWorkspaceId && (
              <span className="current-workspace-badge">
                {workspaceName || 'Untitled'} {result ? '(Analyzed)' : '(Draft)'}
              </span>
            )}
            <button className="workspace-btn" onClick={() => setShowWorkspaceModal(true)}>
              My Workspaces ({savedWorkspaces.length})
            </button>
            <button className="workspace-btn save-btn" onClick={() => {
              if (!workspaceName) {
                const name = prompt('Enter workspace name:', `${DOMAINS.find(d => d.id === domain)?.name} Project`);
                if (name) {
                  setWorkspaceName(name);
                  setTimeout(() => saveWorkspace(), 100);
                }
              } else {
                saveWorkspace();
              }
            }}>
              {savingWorkspace ? 'Saving...' : (currentWorkspaceId ? 'Save' : 'Save As...')}
            </button>
            <button className="workspace-btn new-btn" onClick={startNewWorkspace}>
              New
            </button>
          </div>
        </div>
      </header>

      {showWorkspaceModal && (
        <div className="modal-overlay" onClick={() => setShowWorkspaceModal(false)}>
          <div className="modal-content workspace-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>My Workspaces</h2>
              <button className="modal-close" onClick={() => setShowWorkspaceModal(false)}>×</button>
            </div>
            <div className="workspace-list">
              {loadingWorkspaces ? (
                <p className="workspace-loading">Loading workspaces...</p>
              ) : savedWorkspaces.length === 0 ? (
                <p className="workspace-empty">No saved workspaces yet. Start building and save your work!</p>
              ) : (
                savedWorkspaces.map(ws => (
                  <div key={ws.id} className={`workspace-item ${ws.id === currentWorkspaceId ? 'active' : ''}`}>
                    <div className="workspace-info">
                      <div className="workspace-name">{ws.name}</div>
                      <div className="workspace-meta">
                        <span className="workspace-domain">{DOMAINS.find(d => d.id === ws.domain)?.icon} {DOMAINS.find(d => d.id === ws.domain)?.name}</span>
                        <span className="workspace-status">{ws.status}</span>
                        <span className="workspace-date">Updated: {new Date(ws.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="workspace-actions">
                      <button className="ws-action-btn load" onClick={() => loadWorkspace(ws.id)}>
                        Load
                      </button>
                      <button className="ws-action-btn delete" onClick={() => {
                        if (confirm('Delete this workspace?')) deleteWorkspace(ws.id);
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="primary-btn" onClick={startNewWorkspace}>
                Start New Project
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="main-container">
        <div className="input-panel">
          <h2>Build Your Application</h2>

          <div className="form-group">
            <label>Requirements (Natural Language)</label>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Example: Build an AMI billing system for 5 million meters with 15-minute readings, slab-based tariffs, WhatsApp notifications, and DPDP compliance..."
            />
          </div>

          <div className="form-group">
            <label>Domain / Industry</label>
            <select value={domain} onChange={e => setDomain(e.target.value)}>
              {DOMAINS.map(d => (
                <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{DOMAINS.find(d => d.id === domain)?.entityLabel || 'Number of Entities'}</label>
            <input
              type="number"
              value={deviceCount}
              onChange={e => setDeviceCount(e.target.value)}
              placeholder={DOMAINS.find(d => d.id === domain)?.entityPlaceholder || 'e.g., 100000'}
            />
          </div>

          <div className="form-group">
            <label>{DOMAINS.find(d => d.id === domain)?.transactionLabel || 'Transactions per Day'}</label>
            <input
              type="number"
              value={readingsPerDay}
              onChange={e => setReadingsPerDay(e.target.value)}
              placeholder={DOMAINS.find(d => d.id === domain)?.transactionPlaceholder || 'e.g., 50000'}
            />
          </div>

          <div className="form-group">
            <label>Preferred Database</label>
            <select value={selectedDb} onChange={e => setSelectedDb(e.target.value)}>
              {DATABASES.map(db => (
                <option key={db.id} value={db.id}>{db.name} ({db.type})</option>
              ))}
            </select>
          </div>

          <div 
            className="advanced-options-toggle"
            onClick={() => setExpandedSections(prev => {
              const next = new Set(prev);
              if (next.has('deployment')) next.delete('deployment');
              else next.add('deployment');
              return next;
            })}
          >
            <span className="toggle-icon">{expandedSections.has('deployment') ? '▼' : '▶'}</span>
            <span>Deployment & Cloud</span>
            <span className="toggle-hint">{expandedSections.has('deployment') ? 'Click to collapse' : `${deploymentType === 'cloud' ? 'Cloud' : deploymentType === 'onprem' ? 'On-Prem' : 'Hybrid'}${deploymentType !== 'onprem' ? ` - ${CLOUD_PROVIDERS.find(c => c.id === selectedCloud)?.name || 'AWS'}` : ''}`}</span>
          </div>

          {expandedSections.has('deployment') && (
          <>
          <div className="form-group" style={{ marginTop: 0 }}>
            <label>Deployment Type</label>
            <div className="deployment-type-selector">
              <div 
                className={`deploy-type-chip ${deploymentType === 'cloud' ? 'selected' : ''}`}
                onClick={() => setDeploymentType('cloud')}
              >
                <span>☁️</span> Cloud
              </div>
              <div 
                className={`deploy-type-chip ${deploymentType === 'onprem' ? 'selected' : ''}`}
                onClick={() => setDeploymentType('onprem')}
              >
                <span>🏢</span> On-Prem
              </div>
              <div 
                className={`deploy-type-chip ${deploymentType === 'hybrid' ? 'selected' : ''}`}
                onClick={() => setDeploymentType('hybrid')}
              >
                <span>🔄</span> Hybrid
              </div>
            </div>
          </div>

          {deploymentType !== 'onprem' && (
            <div className="form-group">
              <label>Cloud Provider</label>
              <div className="cloud-providers">
                {CLOUD_PROVIDERS.map(cp => (
                  <div
                    key={cp.id}
                    className={`cloud-chip ${selectedCloud === cp.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCloud(cp.id)}
                  >
                    <span>{cp.icon}</span>
                    <span className="name">{cp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
          )}

          <div 
            className="advanced-options-toggle"
            onClick={() => setExpandedSections(prev => {
              const next = new Set(prev);
              if (next.has('compliance')) next.delete('compliance');
              else next.add('compliance');
              return next;
            })}
          >
            <span className="toggle-icon">{expandedSections.has('compliance') ? '▼' : '▶'}</span>
            <span>Compliance & Standards</span>
            <span className="toggle-hint">{expandedSections.has('compliance') ? 'Click to collapse' : `${compliance.length} selected`}</span>
          </div>

          {expandedSections.has('compliance') && (
          <div className="form-group" style={{ marginTop: 0 }}>
            <div className="checkbox-group">
              {getComplianceForDomain(domain).map(opt => (
                <label key={opt.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={compliance.includes(opt.id)}
                    onChange={() => handleComplianceToggle(opt.id)}
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>
          )}

          <div 
            className="advanced-options-toggle"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <span className="toggle-icon">{showAdvancedOptions ? '▼' : '▶'}</span>
            <span>Advanced Options</span>
            <span className="toggle-hint">{showAdvancedOptions ? 'Click to collapse' : 'Multi-Tenant, CI/CD, Monitoring, more...'}</span>
          </div>

          {showAdvancedOptions && (
          <>
          <div className="form-group">
            <label>Multi-Tenant Configuration</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={multiTenantEnabled} onChange={(e) => setMultiTenantEnabled(e.target.checked)} />
                Enable Multi-Tenancy
              </label>
              {multiTenantEnabled && (
                <div className="level-selector">
                  <div className={`level-chip ${multiTenantLevel === 'ui-only' ? 'selected' : ''}`} onClick={() => setMultiTenantLevel('ui-only')}>UI Only</div>
                  <div className={`level-chip ${multiTenantLevel === 'ui-and-db' ? 'selected' : ''}`} onClick={() => setMultiTenantLevel('ui-and-db')}>UI + Database</div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Multi-Lingual Support</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={multiLingualEnabled} onChange={(e) => setMultiLingualEnabled(e.target.checked)} />
                Enable Multi-Language
              </label>
              {multiLingualEnabled && (
                <>
                  <div className="level-selector">
                    <div className={`level-chip ${multiLingualLevel === 'ui-only' ? 'selected' : ''}`} onClick={() => setMultiLingualLevel('ui-only')}>UI Only</div>
                    <div className={`level-chip ${multiLingualLevel === 'ui-and-db' ? 'selected' : ''}`} onClick={() => setMultiLingualLevel('ui-and-db')}>UI + Database</div>
                  </div>
                  <div className="language-picker">
                    {['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt', 'ru'].map(lang => (
                      <span key={lang} className={`lang-chip ${selectedLanguages.includes(lang) ? 'selected' : ''}`} onClick={() => handleLanguageToggle(lang)}>{lang.toUpperCase()}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="form-section-header">
            <h3>Cross-Domain Features</h3>
          </div>

          <div className="form-group">
            <label>CI/CD Pipeline</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={cicdEnabled} onChange={(e) => setCicdEnabled(e.target.checked)} />
                Enable CI/CD
              </label>
              {cicdEnabled && (
                <div className="option-selector">
                  {(['github-actions', 'gitlab-ci', 'jenkins', 'azure-devops', 'circleci'] as const).map(p => (
                    <span key={p} className={`option-chip ${cicdProvider === p ? 'selected' : ''}`} onClick={() => setCicdProvider(p)}>
                      {p === 'github-actions' ? 'GitHub Actions' : p === 'gitlab-ci' ? 'GitLab CI' : p === 'azure-devops' ? 'Azure DevOps' : p === 'circleci' ? 'CircleCI' : 'Jenkins'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>API Gateway</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={apiGatewayEnabled} onChange={(e) => setApiGatewayEnabled(e.target.checked)} />
                Enable API Gateway
              </label>
              {apiGatewayEnabled && (
                <div className="option-selector">
                  {(['kong', 'aws-api-gateway', 'azure-apim', 'nginx', 'envoy'] as const).map(p => (
                    <span key={p} className={`option-chip ${apiGatewayProvider === p ? 'selected' : ''}`} onClick={() => setApiGatewayProvider(p)}>
                      {p === 'aws-api-gateway' ? 'AWS API GW' : p === 'azure-apim' ? 'Azure APIM' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Monitoring & Observability</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={monitoringEnabled} onChange={(e) => setMonitoringEnabled(e.target.checked)} />
                Enable Monitoring
              </label>
              {monitoringEnabled && (
                <div className="option-selector">
                  {(['prometheus-grafana', 'elk', 'datadog', 'newrelic', 'cloudwatch'] as const).map(s => (
                    <span key={s} className={`option-chip ${monitoringStack === s ? 'selected' : ''}`} onClick={() => setMonitoringStack(s)}>
                      {s === 'prometheus-grafana' ? 'Prometheus+Grafana' : s === 'elk' ? 'ELK Stack' : s === 'cloudwatch' ? 'CloudWatch' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Backup & Disaster Recovery</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={backupDREnabled} onChange={(e) => setBackupDREnabled(e.target.checked)} />
                Enable Backup/DR
              </label>
              {backupDREnabled && (
                <div className="option-selector">
                  {(['hot-standby', 'warm-standby', 'cold-backup', 'pilot-light'] as const).map(s => (
                    <span key={s} className={`option-chip ${backupDRStrategy === s ? 'selected' : ''}`} onClick={() => setBackupDRStrategy(s)}>
                      {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Environments</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={environmentsEnabled} onChange={(e) => setEnvironmentsEnabled(e.target.checked)} />
                Configure Environments
              </label>
              {environmentsEnabled && (
                <div className="option-selector">
                  {['dev', 'staging', 'uat', 'prod', 'dr'].map(env => (
                    <span key={env} className={`option-chip ${selectedEnvironments.includes(env) ? 'selected' : ''}`} onClick={() => handleEnvironmentToggle(env)}>
                      {env.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Notifications & Alerts</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                Enable Notifications
              </label>
              {notificationsEnabled && (
                <div className="option-selector">
                  {['email', 'sms', 'push', 'slack', 'teams', 'webhook'].map(ch => (
                    <span key={ch} className={`option-chip ${notificationChannels.includes(ch) ? 'selected' : ''}`} onClick={() => handleNotificationChannelToggle(ch)}>
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Documentation</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={documentationEnabled} onChange={(e) => setDocumentationEnabled(e.target.checked)} />
                Generate Documentation
              </label>
              {documentationEnabled && (
                <div className="option-selector">
                  {['api', 'user-guide', 'admin-guide', 'developer', 'runbook'].map(dt => (
                    <span key={dt} className={`option-chip ${documentationTypes.includes(dt) ? 'selected' : ''}`} onClick={() => handleDocTypeToggle(dt)}>
                      {dt === 'api' ? 'API Docs' : dt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Performance SLAs</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={performanceSLAEnabled} onChange={(e) => setPerformanceSLAEnabled(e.target.checked)} />
                Define Performance SLAs
              </label>
              {performanceSLAEnabled && (
                <div className="sla-info">
                  <span className="sla-badge">P99 Latency: 200ms</span>
                  <span className="sla-badge">Uptime: 99.9%</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Data Migration</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={dataMigrationEnabled} onChange={(e) => setDataMigrationEnabled(e.target.checked)} />
                Plan Data Migration
              </label>
              {dataMigrationEnabled && (
                <div className="option-selector">
                  {(['big-bang', 'phased', 'parallel-run', 'strangler'] as const).map(s => (
                    <span key={s} className={`option-chip ${dataMigrationStrategy === s ? 'selected' : ''}`} onClick={() => setDataMigrationStrategy(s)}>
                      {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Version Control Workflow</label>
            <div className="toggle-section">
              <label className="toggle-label">
                <input type="checkbox" checked={versionControlEnabled} onChange={(e) => setVersionControlEnabled(e.target.checked)} />
                Configure Git Workflow
              </label>
              {versionControlEnabled && (
                <div className="option-selector">
                  {(['gitflow', 'github-flow', 'trunk-based', 'feature-branch'] as const).map(s => (
                    <span key={s} className={`option-chip ${versionControlStrategy === s ? 'selected' : ''}`} onClick={() => setVersionControlStrategy(s)}>
                      {s === 'github-flow' ? 'GitHub Flow' : s === 'trunk-based' ? 'Trunk-Based' : s === 'feature-branch' ? 'Feature Branch' : 'GitFlow'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          </>
          )}

          <button
            className="generate-btn"
            onClick={analyzeRequirements}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze & Generate Architecture'}
          </button>
        </div>

        <div className="results-panel">
          {!result && !loading && (
            <div className="result-card" style={{ textAlign: 'center', padding: '50px 40px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🚀</div>
              <h3 style={{ border: 'none', justifyContent: 'center', marginBottom: '12px' }}>Intelligent Platform Launcher</h3>
              <p style={{ color: '#a0a0c0', maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                Build production-ready applications in minutes. Configure your requirements on the left panel and click "Analyze" to unlock powerful capabilities.
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                maxWidth: '700px', 
                margin: '0 auto',
                textAlign: 'left'
              }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🤖</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>AI Code Generation</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Generate modules, screens, APIs & tests</div>
                </div>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🗄️</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Database Design</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Auto-generate schemas, tables & ERDs</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏗️</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Architecture & Infra</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Diagrams, sizing & cloud cost estimates</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚙️</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>DevOps & CI/CD</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Terraform, Docker, pipelines & more</div>
                </div>
                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧪</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Testing & Quality</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Benchmarking, API testing & automation</div>
                </div>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔌</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Integrations</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Webhooks, GraphQL & message queues</div>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏢</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Flexible Deployment</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Cloud, On-Prem, Hybrid & Docker/Helm</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📱</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Mobile Apps</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>iOS, Android & PWA generation</div>
                </div>
                <div style={{ background: 'rgba(251, 146, 60, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🌐</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>26+ Industry Domains</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Banking, Healthcare, Retail & more</div>
                </div>
                <div style={{ background: 'rgba(129, 140, 248, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🛡️</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Compliance & Standards</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>HIPAA, GDPR, PCI-DSS, SOC2 & more</div>
                </div>
                <div style={{ background: 'rgba(244, 114, 182, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(244, 114, 182, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏛️</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Multi-Tenant</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Schema, database & row-level isolation</div>
                </div>
                <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🌍</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Multi-Lingual</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>UI & database localization support</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Monitoring</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Metrics, logs, alerts & health checks</div>
                </div>
                <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔧</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Environment Manager</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dev, staging, production & promotions</div>
                </div>
                <div style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔗</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Data Connectivity</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>DB wizard, schema discovery & pipelines</div>
                </div>
                <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💾</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Backup & DR</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Disaster recovery, RPO/RTO strategies</div>
                </div>
                <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔒</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Security Scanning</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Vulnerability detection & AI debugging</div>
                </div>
                <div style={{ background: 'rgba(34, 211, 238, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💰</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Cost Comparison</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>AWS, Azure & GCP pricing estimates</div>
                </div>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📁</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Workspace Management</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Save, load & manage project configs</div>
                </div>
                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Data Migration</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Big-bang, phased & parallel strategies</div>
                </div>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💻</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Multi-Tech Stack</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Node.js, Python, Go & 20+ databases</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚡</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>Redis Caching</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>High-performance caching & session store</div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 8, 
                marginBottom: 16,
                padding: '0 8px'
              }}>
                <button
                  onClick={() => setViewMode('dashboard')}
                  style={{
                    padding: '8px 16px',
                    background: viewMode === 'dashboard' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                    border: viewMode === 'dashboard' ? 'none' : '1px solid #475569',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: viewMode === 'dashboard' ? 600 : 400,
                  }}
                >
                  Dashboard View
                </button>
                <button
                  onClick={() => setViewMode('wizard')}
                  style={{
                    padding: '8px 16px',
                    background: viewMode === 'wizard' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent',
                    border: viewMode === 'wizard' ? 'none' : '1px solid #475569',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: viewMode === 'wizard' ? 600 : 400,
                  }}
                >
                  Setup Wizard
                </button>
              </div>

              {viewMode === 'wizard' ? (
                <div style={{ padding: '0 8px' }}>
                  <GuidedWizard domain={domain} onComplete={() => setViewMode('dashboard')} />
                </div>
              ) : (
              <div className="results-layout">
                {/* Category Sidebar */}
                <div className="category-sidebar">
                  {RESULT_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Category Content */}
                <div className="category-content">
                  {/* Highlights Summary Card */}
                  <div className="highlights-card">
                    <div className="highlight-item">
                      <span className="highlight-label">Tier</span>
                      <span className="highlight-value">{result.infrastructure.tier}</span>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-label">Est. Cost</span>
                      <span className="highlight-value">${result.costs[selectedCloud]?.total?.toLocaleString()}/mo</span>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-label">Cloud</span>
                      <span className="highlight-value">{selectedCloud.toUpperCase()}</span>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-label">Deploy</span>
                      <span className="highlight-value">{deploymentType}</span>
                    </div>
                  </div>

                  {/* OVERVIEW Category */}
                  {activeCategory === 'overview' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('infra-specs')}>
                        <span className="section-icon">{expandedSections.has('infra-specs') ? '▼' : '▶'}</span>
                        <h3><span className="icon">📊</span> Infrastructure Specifications - {result.infrastructure.tier} Tier</h3>
                      </div>
                      {expandedSections.has('infra-specs') && (
                        <div className="section-content">
                          <div className="specs-grid">
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.devices}</div>
                              <div className="label">Devices / Meters</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.dailyRecords}</div>
                              <div className="label">Records / Day</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.compute.totalCPU}</div>
                              <div className="label">Total vCPUs</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.compute.totalRAMDisplay}</div>
                              <div className="label">Total RAM</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.compute.appServers}</div>
                              <div className="label">App Servers</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.compute.dbReplicas + 1}</div>
                              <div className="label">DB Nodes</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.storage.total}</div>
                              <div className="label">Total Storage (Y1)</div>
                            </div>
                            <div className="spec-item">
                              <div className="value">{result.infrastructure.network.ingress}</div>
                              <div className="label">Network Bandwidth</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recommended Tech Stack Section */}
                    {result.techStack && (
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('tech-stack')}>
                        <span className="section-icon">{expandedSections.has('tech-stack') ? '▼' : '▶'}</span>
                        <h3><span className="icon">⚡</span> Recommended Tech Stack - {result.techStack.tier} Tier</h3>
                      </div>
                      {expandedSections.has('tech-stack') && (
                        <div className="section-content">
                          <h4 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application Framework</h4>
                          <div className="tech-stack-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className="tech-stack-card" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🔧</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Backend</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>{result.techStack.backend.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.backend.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🖥️</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Frontend</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#06b6d4', marginBottom: '4px' }}>{result.techStack.frontend.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.frontend.description}</div>
                            </div>
                          </div>

                          <h4 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Layer</h4>
                          <div className="tech-stack-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className="tech-stack-card" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🗄️</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Primary Database</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>{result.techStack.primaryDb.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.primaryDb.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📊</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Analytics Database</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>{result.techStack.analyticsDb.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.analyticsDb.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📨</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Message Queue</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>{result.techStack.queue.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.queue.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Cache Layer</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>{result.techStack.cache.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.cache.description}</div>
                            </div>
                          </div>

                          <h4 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Processing & Analytics</h4>
                          <div className="tech-stack-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className="tech-stack-card" style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🌊</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Streaming Platform</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>{result.techStack.streaming.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.streaming.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🔄</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>ETL / Data Pipeline</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>{result.techStack.etl.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.etl.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📈</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Analytics / BI</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>{result.techStack.analytics.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.analytics.description}</div>
                            </div>
                          </div>

                          <h4 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Platform</h4>
                          <div className="tech-stack-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            <div className="tech-stack-card" style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🏢</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Data Warehouse</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0ea5e9', marginBottom: '4px' }}>{result.techStack.dataWarehouse.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.dataWarehouse.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🌊</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Data Lake</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>{result.techStack.dataLake.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.dataLake.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📡</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Data Ingestion</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>{result.techStack.dataIngestion.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.dataIngestion.description}</div>
                            </div>
                            <div className="tech-stack-card" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🔐</span>
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Data Governance</span>
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1', marginBottom: '4px' }}>{result.techStack.dataGovernance.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{result.techStack.dataGovernance.description}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('hardware')}>
                        <span className="section-icon">{expandedSections.has('hardware') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🖥️</span> Hardware Recommendations</h3>
                      </div>
                      {expandedSections.has('hardware') && (
                        <div className="section-content">
                          <div className="hardware-specs">
                            {getHardwareRecommendations(result.infrastructure).map((hw, idx) => (
                              <div key={idx} className="hardware-card">
                                <h4>{hw.component} ({hw.count}x)</h4>
                                <div className="hardware-row">
                                  <span className="label">Specs:</span>
                                  <span className="value">{hw.specs}</span>
                                </div>
                                <div className="hardware-row">
                                  <span className="label">AWS:</span>
                                  <span className="instance-type">{hw.awsInstance}</span>
                                </div>
                                <div className="hardware-row">
                                  <span className="label">Azure:</span>
                                  <span className="instance-type">{hw.azureInstance}</span>
                                </div>
                                <div className="hardware-row">
                                  <span className="label">GCP:</span>
                                  <span className="instance-type">{hw.gcpInstance}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cost Comparison Section */}
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('costs')}>
                        <span className="section-icon">{expandedSections.has('costs') ? '▼' : '▶'}</span>
                        <h3><span className="icon">💰</span> Cost Estimates (Monthly)</h3>
                      </div>
                      {expandedSections.has('costs') && (
                        <div className="section-content">
                          <div className="cost-breakdown">
                            {Object.entries(result.costs).map(([provider, cost]) => (
                              <div key={provider} className={`cost-item ${provider === selectedCloud ? 'total' : ''}`}>
                                <h4>{CLOUD_PROVIDERS.find(c => c.id === provider)?.icon} {provider.toUpperCase()}</h4>
                                <div className="price">${cost.total.toLocaleString()}/mo</div>
                                <div className="cost-details">
                                  <div className="cost-line"><span>Compute (App):</span><span>${cost.compute.toLocaleString()}</span></div>
                                  <div className="cost-line"><span>Database:</span><span>${cost.database.toLocaleString()}</span></div>
                                  <div className="cost-line"><span>Cache (Redis):</span><span>${cost.cache.toLocaleString()}</span></div>
                                  {cost.queue > 0 && <div className="cost-line"><span>Queue (Kafka):</span><span>${cost.queue.toLocaleString()}</span></div>}
                                  <div className="cost-line"><span>Storage:</span><span>${cost.storage.toLocaleString()}</span></div>
                                  <div className="cost-line"><span>Network Egress:</span><span>${cost.network.toLocaleString()}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="pricing-note">
                            Estimates based on on-demand pricing. Actual costs may vary. Reserved instances can reduce costs by 30-60%.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Security Section */}
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('security')}>
                        <span className="section-icon">{expandedSections.has('security') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🔒</span> Security & Compliance</h3>
                      </div>
                      {expandedSections.has('security') && (
                        <div className="section-content">
                          <div className="security-grid">
                            {result.security.map((sec, idx) => (
                              <div key={idx} className="security-item">
                                <span className={`badge ${sec.status}`}>
                                  {sec.status === 'required' ? 'Required' : sec.status === 'recommended' ? 'Recommended' : 'Included'}
                                </span>
                                <div className="content">
                                  <h5>{sec.name}</h5>
                                  <p>{sec.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deployment Section */}
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('deployment')}>
                        <span className="section-icon">{expandedSections.has('deployment') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🚀</span> Deployment Options</h3>
                      </div>
                      {expandedSections.has('deployment') && (
                        <div className="section-content">
                          <div className="deployment-options">
                            <div 
                              className={`deploy-option ${deploymentType === 'cloud' ? 'active' : ''}`}
                              onClick={() => setDeploymentType('cloud')}
                            >
                              <h4>☁️ Cloud Deploy</h4>
                              <p>One-click deployment to {selectedCloud.toUpperCase()}</p>
                              <ul>
                                <li>Auto-provisioning (5-10 min)</li>
                                <li>Managed Kubernetes</li>
                                <li>Auto SSL certificates</li>
                                <li>Built-in monitoring</li>
                              </ul>
                            </div>
                            <div 
                              className={`deploy-option ${deploymentType === 'onprem' ? 'active' : ''}`}
                              onClick={() => setDeploymentType('onprem')}
                            >
                              <h4>🏢 On-Premises</h4>
                              <p>Deploy in your data center</p>
                              <ul>
                                <li>Docker Compose / Helm</li>
                                <li>VM Images (OVA)</li>
                                <li>Ansible Playbooks</li>
                                <li>Air-Gapped Bundle</li>
                              </ul>
                            </div>
                            <div 
                              className={`deploy-option ${deploymentType === 'hybrid' ? 'active' : ''}`}
                              onClick={() => setDeploymentType('hybrid')}
                            >
                              <h4>🔄 Hybrid</h4>
                              <p>Cloud management + On-prem data</p>
                              <ul>
                                <li>Data stays local</li>
                                <li>Cloud monitoring</li>
                                <li>Secure VPN tunnel</li>
                                <li>Remote updates</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Export Section */}
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('export')}>
                        <span className="section-icon">{expandedSections.has('export') ? '▼' : '▶'}</span>
                        <h3><span className="icon">📥</span> Export Specifications</h3>
                      </div>
                      {expandedSections.has('export') && (
                        <div className="section-content">
                          <div className="export-buttons">
                            <button 
                              className="export-btn primary"
                              onClick={() => {
                                const exportData = {
                                  project: {
                                    domain: DOMAINS.find(d => d.id === domain)?.name,
                                    database: selectedDb,
                                    cloud: selectedCloud,
                                    deploymentType,
                                    compliance: compliance.map(c => COMPLIANCE_OPTIONS.find(opt => opt.id === c)?.name)
                                  },
                                  infrastructure: result.infrastructure,
                                  hardware: getHardwareRecommendations(result.infrastructure),
                                  costs: result.costs,
                                  security: result.security,
                                  cluster: result.clusterConfig,
                                  generatedAt: new Date().toISOString()
                                };
                                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `ipl-spec-${domain}-${Date.now()}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              📄 Export JSON
                            </button>
                            <button 
                              className="export-btn"
                              onClick={() => {
                                const hw = getHardwareRecommendations(result.infrastructure);
                                let csv = 'Component,Count,Specs,AWS Instance,Azure Instance,GCP Instance\n';
                                hw.forEach(h => {
                                  csv += `"${h.component}",${h.count},"${h.specs}","${h.awsInstance}","${h.azureInstance}","${h.gcpInstance}"\n`;
                                });
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `ipl-hardware-${domain}-${Date.now()}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              📊 Export Hardware CSV
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                  )}

                  {/* ARCHITECTURE Category */}
                  {activeCategory === 'architecture' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('arch-diagram')}>
                        <span className="section-icon">{expandedSections.has('arch-diagram') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🏗️</span> Architecture Diagram</h3>
                      </div>
                      {expandedSections.has('arch-diagram') && (
                        <div className="section-content">
                          <div className="diagram-controls">
                            <button 
                              className={`view-toggle ${diagramView === 'visual' ? 'active' : ''}`}
                              onClick={() => setDiagramView('visual')}
                            >
                              Visual
                            </button>
                            <button 
                              className={`view-toggle ${diagramView === 'ascii' ? 'active' : ''}`}
                              onClick={() => setDiagramView('ascii')}
                            >
                              ASCII
                            </button>
                          </div>
                          {diagramView === 'visual' ? (
                            <ArchitectureDiagram 
                              infra={result.infrastructure} 
                              database={selectedDb}
                              cloud={selectedCloud}
                            />
                          ) : (
                            <div className="architecture-diagram">
                              {result.architecture}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('erd')}>
                        <span className="section-icon">{expandedSections.has('erd') ? '▼' : '▶'}</span>
                        <h3><span className="icon">📊</span> Database Schema (ERD)</h3>
                      </div>
                      {expandedSections.has('erd') && (
                        <div className="section-content">
                          <ERDiagram tables={generatedArtifacts?.tables || []} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('cluster')}>
                        <span className="section-icon">{expandedSections.has('cluster') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🔧</span> Cluster Configuration</h3>
                      </div>
                      {expandedSections.has('cluster') && (
                        <div className="section-content">
                          <div className="cluster-config">
                            <div className="cluster-section">
                              <h4>🖥️ Application Cluster</h4>
                              <div className="cluster-item">
                                <span className="name">Node Count</span>
                                <span className="value">{result.clusterConfig.appCluster.nodes}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Load Balancer</span>
                                <span className="value">{result.clusterConfig.appCluster.loadBalancer}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Auto-Scaling</span>
                                <span className="value">{result.clusterConfig.appCluster.autoScaling ? 'Enabled' : 'Disabled'}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Scale Range</span>
                                <span className="value">{result.clusterConfig.appCluster.minNodes} - {result.clusterConfig.appCluster.maxNodes}</span>
                              </div>
                            </div>
                            <div className="cluster-section">
                              <h4>🗄️ Database Cluster</h4>
                              <div className="cluster-item">
                                <span className="name">Cluster Type</span>
                                <span className="value">{result.clusterConfig.dbCluster.type}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Primary Nodes</span>
                                <span className="value">{result.clusterConfig.dbCluster.primaryNodes}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Replica Nodes</span>
                                <span className="value">{result.clusterConfig.dbCluster.replicaNodes}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Sharding</span>
                                <span className="value">{result.clusterConfig.dbCluster.sharding ? 'Enabled' : 'Disabled'}</span>
                              </div>
                              <div className="cluster-item">
                                <span className="name">Replication</span>
                                <span className="value">{result.clusterConfig.dbCluster.replicationMode}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                  )}

                  {/* BUILD Category */}
                  {activeCategory === 'build' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('ai-code')}>
                        <span className="section-icon">{expandedSections.has('ai-code') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🤖</span> AI Code Assistant</h3>
                      </div>
                      {expandedSections.has('ai-code') && (
                        <div className="section-content">
                          <AICodePanel
                            domain={domain}
                            database={selectedDb}
                            entityCount={devices}
                            transactionsPerDay={readings}
                            compliance={compliance}
                            deploymentType={deploymentType}
                            modules={generatedArtifacts?.modules}
                            screens={generatedArtifacts?.screens}
                            tables={generatedArtifacts?.tables}
                          />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('devops')}>
                        <span className="section-icon">{expandedSections.has('devops') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🛠️</span> DevOps & Automation</h3>
                      </div>
                      {expandedSections.has('devops') && (
                        <div className="section-content">
                          <DevOpsPanel
                            domain={domain}
                            database={selectedDb}
                            tier={result.infrastructure.tier}
                            appServers={result.infrastructure.compute.appServers}
                            dbReplicas={result.infrastructure.compute.dbReplicas}
                            cacheNodes={result.infrastructure.compute.cacheNodes}
                            storageGB={result.infrastructure.storage.totalGB}
                            monthlyEgressGB={result.infrastructure.network.monthlyEgressGB}
                            currentCost={result.costs[selectedCloud]?.total || 5000}
                            compliance={compliance}
                            tables={generatedArtifacts?.tables || []}
                            cloudProvider={selectedCloud}
                          />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('backend-api')}>
                        <span className="section-icon">{expandedSections.has('backend-api') ? '▼' : '▶'}</span>
                        <h3><span className="icon">⚙️</span> Backend API Code</h3>
                      </div>
                      {expandedSections.has('backend-api') && (
                        <div className="section-content">
                          <CodeEditor domain={domain} tables={generatedArtifacts?.tables} />
                        </div>
                      )}
                    </div>
                  </>
                  )}

                  {/* TESTING Category */}
                  {activeCategory === 'testing' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('benchmarking')}>
                        <span className="section-icon">{expandedSections.has('benchmarking') ? '▼' : '▶'}</span>
                        <h3><span className="icon">⚡</span> App Benchmarking</h3>
                      </div>
                      {expandedSections.has('benchmarking') && (
                        <div className="section-content">
                          <BenchmarkPanel domain={domain} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('api-testing')}>
                        <span className="section-icon">{expandedSections.has('api-testing') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🔌</span> API Testing</h3>
                      </div>
                      {expandedSections.has('api-testing') && (
                        <div className="section-content">
                          <ApiTestPanel />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('ai-automation')}>
                        <span className="section-icon">{expandedSections.has('ai-automation') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🤖</span> AI Automation</h3>
                      </div>
                      {expandedSections.has('ai-automation') && (
                        <div className="section-content">
                          <AIAutomationPanel domain={domain} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('testing-quality')}>
                        <span className="section-icon">{expandedSections.has('testing-quality') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🧪</span> Testing & Quality</h3>
                      </div>
                      {expandedSections.has('testing-quality') && (
                        <div className="section-content">
                          <TestingQualityPanel domain={domain} tables={generatedArtifacts?.tables} />
                        </div>
                      )}
                    </div>
                  </>
                  )}

                  {/* OPERATIONS Category */}
                  {activeCategory === 'operations' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('monitoring')}>
                        <span className="section-icon">{expandedSections.has('monitoring') ? '▼' : '▶'}</span>
                        <h3><span className="icon">📊</span> Monitoring & Observability</h3>
                      </div>
                      {expandedSections.has('monitoring') && (
                        <div className="section-content">
                          <MonitoringPanel domain={domain} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('environments')}>
                        <span className="section-icon">{expandedSections.has('environments') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🌍</span> Environment Manager</h3>
                      </div>
                      {expandedSections.has('environments') && (
                        <div className="section-content">
                          <EnvironmentPanel domain={domain} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('data-connectivity')}>
                        <span className="section-icon">{expandedSections.has('data-connectivity') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🔌</span> Data Connectivity</h3>
                      </div>
                      {expandedSections.has('data-connectivity') && (
                        <div className="section-content">
                          <DataConnectivityPanel domain={domain} selectedDb={selectedDb} />
                        </div>
                      )}
                    </div>
                  </>
                  )}

                  {/* INTEGRATIONS Category */}
                  {activeCategory === 'integrations' && (
                  <>
                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('integrations-apis')}>
                        <span className="section-icon">{expandedSections.has('integrations-apis') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🔗</span> Integrations & APIs</h3>
                      </div>
                      {expandedSections.has('integrations-apis') && (
                        <div className="section-content">
                          <IntegrationPanel domain={domain} tables={generatedArtifacts?.tables} />
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <div className="section-header" onClick={() => toggleSection('dev-tools')}>
                        <span className="section-icon">{expandedSections.has('dev-tools') ? '▼' : '▶'}</span>
                        <h3><span className="icon">🛠️</span> Development Tools</h3>
                      </div>
                      {expandedSections.has('dev-tools') && (
                        <div className="section-content">
                          <DevToolsPanel domain={domain} tables={generatedArtifacts?.tables} />
                        </div>
                      )}
                    </div>
                  </>
                  )}

                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
