import { useState } from "react";
import "./App.css";

interface InfraSpec {
  tier: string;
  dailyRecords: string;
  devices: string;
  compute: {
    appServers: number;
    dbPrimary: number;
    dbReplicas: number;
    cacheNodes: number;
    totalCPU: number;
    totalRAM: string;
  };
  storage: {
    database: string;
    backup: string;
    logs: string;
    total: string;
  };
  network: {
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

interface AnalysisResult {
  domain: string;
  infrastructure: InfraSpec;
  architecture: string;
  costs: Record<string, CostEstimate>;
  security: SecurityReq[];
  clusterConfig: ClusterConfig;
  mobileConfig: MobileConfig;
  deploymentFormats: string[];
}

const DOMAINS = [
  { id: 'ami', name: 'AMI / Smart Metering', icon: '⚡' },
  { id: 'banking', name: 'Banking & Finance', icon: '🏦' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭' },
  { id: 'retail', name: 'Retail & E-commerce', icon: '🛒' },
  { id: 'custom', name: 'Custom Domain', icon: '🔧' },
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
];

const CLOUD_PROVIDERS = [
  { id: 'aws', name: 'AWS', icon: '☁️' },
  { id: 'azure', name: 'Azure', icon: '🔷' },
  { id: 'gcp', name: 'Google Cloud', icon: '🌐' },
];

const COMPLIANCE_OPTIONS = [
  { id: 'hipaa', name: 'HIPAA' },
  { id: 'gdpr', name: 'GDPR' },
  { id: 'pci', name: 'PCI-DSS' },
  { id: 'soc2', name: 'SOC 2' },
  { id: 'dpdp', name: 'DPDP (India)' },
  { id: 'iso27001', name: 'ISO 27001' },
];

function calculateInfrastructure(deviceCount: number, readingsPerDay: number): InfraSpec {
  const dailyRecords = deviceCount * readingsPerDay;
  
  let tier: string;
  let compute: InfraSpec['compute'];
  let storage: InfraSpec['storage'];
  let network: InfraSpec['network'];
  
  if (dailyRecords < 1_000_000) {
    tier = 'Small';
    compute = { appServers: 2, dbPrimary: 1, dbReplicas: 0, cacheNodes: 1, totalCPU: 8, totalRAM: '36 GB' };
    storage = { database: '500 GB', backup: '1 TB', logs: '100 GB', total: '~2 TB' };
    network = { ingress: '100 Mbps', egress: '100 Mbps', internal: '1 Gbps' };
  } else if (dailyRecords < 100_000_000) {
    tier = 'Medium';
    compute = { appServers: 4, dbPrimary: 1, dbReplicas: 2, cacheNodes: 2, totalCPU: 38, totalRAM: '200 GB' };
    storage = { database: '5 TB', backup: '15 TB', logs: '500 GB', total: '~25 TB' };
    network = { ingress: '500 Mbps', egress: '500 Mbps', internal: '10 Gbps' };
  } else if (dailyRecords < 1_000_000_000) {
    tier = 'Large';
    compute = { appServers: 8, dbPrimary: 1, dbReplicas: 3, cacheNodes: 6, totalCPU: 170, totalRAM: '832 GB' };
    storage = { database: '50 TB', backup: '150 TB', logs: '2 TB', total: '~250 TB' };
    network = { ingress: '2 Gbps', egress: '2 Gbps', internal: '25 Gbps' };
  } else {
    tier = 'Massive';
    compute = { appServers: 20, dbPrimary: 3, dbReplicas: 9, cacheNodes: 9, totalCPU: 500, totalRAM: '2+ TB' };
    storage = { database: '500 TB', backup: '1.5 PB', logs: '10 TB', total: '~2.5 PB' };
    network = { ingress: '10+ Gbps', egress: '10+ Gbps', internal: '100 Gbps' };
  }
  
  return {
    tier,
    dailyRecords: formatNumber(dailyRecords),
    devices: formatNumber(deviceCount),
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

function calculateCosts(infra: InfraSpec): Record<string, CostEstimate> {
  const tierMultipliers: Record<string, number> = {
    'Small': 1,
    'Medium': 6,
    'Large': 40,
    'Massive': 150
  };
  
  const mult = tierMultipliers[infra.tier] || 1;
  
  const baseCosts = {
    compute: 200 * mult,
    storage: 50 * mult,
    network: 30 * mult,
    database: 100 * mult,
    cache: 40 * mult,
    queue: 30 * mult
  };
  
  return {
    aws: {
      ...baseCosts,
      total: Object.values(baseCosts).reduce((a, b) => a + b, 0),
      currency: 'USD'
    },
    azure: {
      compute: baseCosts.compute * 0.95,
      storage: baseCosts.storage * 0.9,
      network: baseCosts.network * 1.1,
      database: baseCosts.database * 0.92,
      cache: baseCosts.cache * 0.88,
      queue: baseCosts.queue * 0.85,
      total: Object.values(baseCosts).reduce((a, b) => a + b, 0) * 0.93,
      currency: 'USD'
    },
    gcp: {
      compute: baseCosts.compute * 0.88,
      storage: baseCosts.storage * 0.85,
      network: baseCosts.network * 0.9,
      database: baseCosts.database * 0.9,
      cache: baseCosts.cache * 0.9,
      queue: baseCosts.queue * 0.9,
      total: Object.values(baseCosts).reduce((a, b) => a + b, 0) * 0.89,
      currency: 'USD'
    }
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
  
  return reqs;
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
    
    const analysisResult: AnalysisResult = {
      domain: DOMAINS.find(d => d.id === domain)?.name || domain,
      infrastructure,
      architecture,
      costs,
      security,
      clusterConfig,
      mobileConfig: {
        platform: mobileApps,
        framework: mobileApps.length > 1 ? 'React Native' : mobileApps[0] === 'ios' ? 'Swift' : 'Kotlin',
        features: ['Offline Sync', 'Push Notifications', 'Biometric Auth', 'Real-time Updates']
      },
      deploymentFormats: deploymentType === 'cloud' 
        ? ['Docker', 'Kubernetes Helm', 'Terraform'] 
        : deploymentType === 'onprem'
        ? ['Docker Compose', 'VM Images (OVA)', 'Ansible Playbooks', 'Air-Gapped Bundle']
        : ['Docker', 'Kubernetes', 'VPN Gateway', 'Edge Sync Agent']
    };
    
    setResult(analysisResult);
    setLoading(false);
  };

  return (
    <div className="platform-launcher">
      <header className="header">
        <h1>Intelligent Platform Launcher</h1>
        <p>Domain-agnostic • Database-agnostic • Multi-Cloud • On-Prem Ready</p>
      </header>

      <div className="main-container">
        <div className="input-panel">
          <h2>Configure Your Application</h2>

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
            <label>Number of Devices / Meters</label>
            <input
              type="number"
              value={deviceCount}
              onChange={e => setDeviceCount(e.target.value)}
              placeholder="e.g., 5000000"
            />
          </div>

          <div className="form-group">
            <label>Readings / Transactions per Day (per device)</label>
            <input
              type="number"
              value={readingsPerDay}
              onChange={e => setReadingsPerDay(e.target.value)}
              placeholder="e.g., 96 (every 15 min)"
            />
          </div>

          <div className="form-group">
            <label>Preferred Database</label>
            <div className="db-grid">
              {DATABASES.map(db => (
                <div
                  key={db.id}
                  className={`db-chip ${selectedDb === db.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDb(db.id)}
                >
                  <div className="name">{db.name}</div>
                  <div className="type">{db.type}</div>
                </div>
              ))}
            </div>
          </div>

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

          <div className="form-group">
            <label>Compliance Requirements</label>
            <div className="checkbox-group">
              {COMPLIANCE_OPTIONS.map(opt => (
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
            <div className="result-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚀</div>
              <h3 style={{ border: 'none', justifyContent: 'center' }}>Configure your application requirements</h3>
              <p style={{ color: '#a0a0c0', maxWidth: '500px', margin: '0 auto' }}>
                Fill in the details on the left panel and click "Analyze" to see infrastructure recommendations, 
                cost estimates, architecture diagrams, and deployment options.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="result-card">
                <h3><span className="icon">📊</span> Infrastructure Specifications - {result.infrastructure.tier} Tier</h3>
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
                    <div className="value">{result.infrastructure.compute.totalRAM}</div>
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

              <div className="result-card">
                <h3><span className="icon">🏗️</span> Architecture Diagram</h3>
                <div className="architecture-diagram">
                  {result.architecture}
                </div>
              </div>

              <div className="result-card">
                <h3><span className="icon">💰</span> Cost Estimates (Monthly)</h3>
                <div className="cost-breakdown">
                  {Object.entries(result.costs).map(([provider, cost]) => (
                    <div key={provider} className={`cost-item ${provider === selectedCloud ? 'total' : ''}`}>
                      <h4>{CLOUD_PROVIDERS.find(c => c.id === provider)?.icon} {provider.toUpperCase()}</h4>
                      <div className="price">${cost.total.toLocaleString()}/mo</div>
                      <div className="note">
                        Compute: ${cost.compute.toLocaleString()} | DB: ${cost.database.toLocaleString()} | Storage: ${cost.storage.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card">
                <h3><span className="icon">🔒</span> Security & Compliance</h3>
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

              <div className="result-card">
                <h3><span className="icon">🚀</span> Deployment Options</h3>
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

              <div className="result-card">
                <h3><span className="icon">🔧</span> Cluster Configuration</h3>
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

              <div className="result-card">
                <h3><span className="icon">📱</span> Mobile App Generation</h3>
                <div className="mobile-section">
                  <div 
                    className={`mobile-option ${mobileApps.includes('ios') ? 'selected' : ''}`}
                    onClick={() => handleMobileToggle('ios')}
                  >
                    <div className="icon">🍎</div>
                    <h5>iOS App</h5>
                    <p>Native Swift or React Native</p>
                  </div>
                  <div 
                    className={`mobile-option ${mobileApps.includes('android') ? 'selected' : ''}`}
                    onClick={() => handleMobileToggle('android')}
                  >
                    <div className="icon">🤖</div>
                    <h5>Android App</h5>
                    <p>Native Kotlin or React Native</p>
                  </div>
                  <div 
                    className={`mobile-option ${mobileApps.includes('pwa') ? 'selected' : ''}`}
                    onClick={() => handleMobileToggle('pwa')}
                  >
                    <div className="icon">🌐</div>
                    <h5>Progressive Web App</h5>
                    <p>Works on any device</p>
                  </div>
                </div>
                {mobileApps.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(74, 74, 240, 0.1)', borderRadius: '10px' }}>
                    <p style={{ color: '#a0a0c0', fontSize: '0.9rem' }}>
                      <strong style={{ color: '#4a4af0' }}>Selected:</strong> {mobileApps.map(p => p.toUpperCase()).join(', ')} | 
                      <strong style={{ color: '#4a4af0' }}> Framework:</strong> {result.mobileConfig.framework} | 
                      <strong style={{ color: '#4a4af0' }}> Features:</strong> {result.mobileConfig.features.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="result-card">
                <h3><span className="icon">📦</span> Deployment Artifacts</h3>
                <p style={{ color: '#a0a0c0', marginBottom: '16px' }}>
                  Based on your {deploymentType} deployment choice, the following artifacts will be generated:
                </p>
                <div className="specs-grid">
                  {result.deploymentFormats.map((format, idx) => (
                    <div key={idx} className="spec-item">
                      <div className="value" style={{ fontSize: '1.2rem' }}>📄</div>
                      <div className="label">{format}</div>
                    </div>
                  ))}
                </div>
                <div className="action-buttons">
                  <button className="action-btn primary">
                    ⚡ Deploy Now
                  </button>
                  <button className="action-btn secondary">
                    📥 Download Package
                  </button>
                  <button className="action-btn secondary">
                    📋 Export Spec
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Analyzing requirements and generating architecture...</p>
          </div>
        </div>
      )}
    </div>
  );
}
