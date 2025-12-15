import { useState } from 'react';

const AI_SERVICE_URL = 'http://localhost:8080';

interface DevOpsPanelProps {
  domain: string;
  database: string;
  tier: string;
  appServers: number;
  dbReplicas: number;
  cacheNodes: number;
  storageGB: number;
  monthlyEgressGB: number;
  currentCost: number;
  compliance: string[];
  tables: Array<{ name: string; columns: Array<{ name: string; type: string; primary?: boolean; foreignKey?: string }> }>;
  cloudProvider: string;
}

type TabType = 'infrastructure' | 'cicd' | 'api-docs' | 'migrations' | 'auth' | 'load-tests' | 'security' | 'cost';

export default function DevOpsPanel(props: DevOpsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('infrastructure');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('all');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
    { id: 'cicd', label: 'CI/CD', icon: '🔄' },
    { id: 'api-docs', label: 'API Docs', icon: '📚' },
    { id: 'migrations', label: 'Migrations', icon: '🗃️' },
    { id: 'auth', label: 'Auth', icon: '🔐' },
    { id: 'load-tests', label: 'Load Tests', icon: '📈' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'cost', label: 'Cost Optimizer', icon: '💰' },
  ];

  const generateInfrastructure = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-infrastructure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          domain: props.domain,
          database: props.database,
          tier: props.tier,
          appServers: props.appServers,
          dbReplicas: props.dbReplicas,
          cacheNodes: props.cacheNodes,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const generateCICD = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-cicd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          domain: props.domain,
          cloudProvider: props.cloudProvider,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const generateAPIDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-api-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: props.domain,
          tables: props.tables,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const generateMigrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-migrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          domain: props.domain,
          database: props.database,
          tables: props.tables,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const generateAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          domain: props.domain,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const generateLoadTests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/generate-load-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          domain: props.domain,
          targetRPS: 100,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to generate' });
    }
    setLoading(false);
  };

  const runSecurityScan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/security-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: props.domain,
          compliance: props.compliance,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to scan' });
    }
    setLoading(false);
  };

  const getCostOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/cost-optimization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: props.domain,
          tier: props.tier,
          cloudProvider: props.cloudProvider,
          currentCost: props.currentCost,
          appServers: props.appServers,
          dbReplicas: props.dbReplicas,
          cacheNodes: props.cacheNodes,
          storageGB: props.storageGB,
          monthlyEgressGB: props.monthlyEgressGB,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: 'Failed to optimize' });
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'infrastructure':
        return (
          <div className="devops-section">
            <h3>Infrastructure as Code</h3>
            <p>Generate deployment configurations for your infrastructure.</p>
            <div className="devops-options">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">All Formats</option>
                <option value="terraform">Terraform</option>
                <option value="cloudformation">CloudFormation</option>
                <option value="dockerfile">Dockerfile</option>
                <option value="docker-compose">Docker Compose</option>
                <option value="kubernetes">Kubernetes</option>
                <option value="helm">Helm Chart</option>
              </select>
              <button onClick={generateInfrastructure} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        );
      
      case 'cicd':
        return (
          <div className="devops-section">
            <h3>CI/CD Pipelines</h3>
            <p>Generate continuous integration and deployment pipelines.</p>
            <div className="devops-options">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">All Providers</option>
                <option value="github-actions">GitHub Actions</option>
                <option value="gitlab-ci">GitLab CI</option>
                <option value="jenkins">Jenkins</option>
              </select>
              <button onClick={generateCICD} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        );
      
      case 'api-docs':
        return (
          <div className="devops-section">
            <h3>API Documentation</h3>
            <p>Generate OpenAPI/Swagger specification from your schema.</p>
            <div className="devops-options">
              <button onClick={generateAPIDocs} disabled={loading || props.tables.length === 0}>
                {loading ? 'Generating...' : 'Generate OpenAPI Spec'}
              </button>
              {props.tables.length === 0 && <span className="warning">Run analysis first to generate tables</span>}
            </div>
          </div>
        );
      
      case 'migrations':
        return (
          <div className="devops-section">
            <h3>Database Migrations</h3>
            <p>Generate database migration scripts and ORM schemas.</p>
            <div className="devops-options">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">All Formats</option>
                <option value="sql">SQL Migration</option>
                <option value="drizzle">Drizzle Schema</option>
              </select>
              <button onClick={generateMigrations} disabled={loading || props.tables.length === 0}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        );
      
      case 'auth':
        return (
          <div className="devops-section">
            <h3>Authentication</h3>
            <p>Generate authentication blueprints for your application.</p>
            <div className="devops-options">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="jwt">JWT Authentication</option>
                <option value="oauth">OAuth (Google/GitHub)</option>
              </select>
              <button onClick={generateAuth} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        );
      
      case 'load-tests':
        return (
          <div className="devops-section">
            <h3>Load Testing</h3>
            <p>Generate load testing scripts for performance validation.</p>
            <div className="devops-options">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">All Tools</option>
                <option value="k6">k6 Script</option>
                <option value="jmeter">JMeter Config</option>
              </select>
              <button onClick={generateLoadTests} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="devops-section">
            <h3>Security Scanner</h3>
            <p>Run security analysis and get compliance recommendations.</p>
            <div className="devops-options">
              <button onClick={runSecurityScan} disabled={loading}>
                {loading ? 'Scanning...' : 'Run Security Scan'}
              </button>
            </div>
          </div>
        );
      
      case 'cost':
        return (
          <div className="devops-section">
            <h3>Cost Optimizer</h3>
            <p>Get AI-powered recommendations to reduce cloud costs.</p>
            <div className="devops-options">
              <button onClick={getCostOptimization} disabled={loading}>
                {loading ? 'Analyzing...' : 'Get Recommendations'}
              </button>
            </div>
          </div>
        );
    }
  };

  const renderResults = () => {
    if (!result) return null;
    
    if (result.error) {
      return <div className="devops-error">{result.error}</div>;
    }
    
    if (activeTab === 'security' && result.report) {
      return (
        <div className="security-report">
          <div className="security-score">
            <div className="score-circle" data-grade={result.report.grade}>
              <span className="grade">{result.report.grade}</span>
              <span className="score">{result.report.score}/100</span>
            </div>
          </div>
          <h4>Issues Found ({result.report.issues.length})</h4>
          <div className="issues-list">
            {result.report.issues.map((issue: any, i: number) => (
              <div key={i} className={`issue-item severity-${issue.severity}`}>
                <span className="severity-badge">{issue.severity}</span>
                <strong>{issue.title}</strong>
                <p>{issue.description}</p>
                <div className="recommendation">{issue.recommendation}</div>
              </div>
            ))}
          </div>
          {result.report.complianceChecks.length > 0 && (
            <>
              <h4>Compliance Checks</h4>
              {result.report.complianceChecks.map((check: any, i: number) => (
                <div key={i} className="compliance-check">
                  <strong>{check.standard}</strong>
                  <span className="check-results">Passed: {check.passed} | Failed: {check.failed}</span>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }
    
    if (activeTab === 'cost') {
      return (
        <div className="cost-report">
          <div className="cost-summary">
            <div className="cost-card">
              <span className="label">Current Cost</span>
              <span className="value">${result.currentMonthlyCost?.toLocaleString()}/mo</span>
            </div>
            <div className="cost-card optimized">
              <span className="label">Optimized Cost</span>
              <span className="value">${result.optimizedMonthlyCost?.toLocaleString()}/mo</span>
            </div>
            <div className="cost-card savings">
              <span className="label">Potential Savings</span>
              <span className="value">${result.totalSavings?.toLocaleString()}/mo ({result.savingsPercentage}%)</span>
            </div>
          </div>
          <h4>Quick Wins</h4>
          {result.quickWins?.map((rec: any, i: number) => (
            <div key={i} className="recommendation-card">
              <div className="rec-header">
                <span className="category">{rec.category}</span>
                <span className="savings">Save ~${rec.estimatedSavings}/mo</span>
              </div>
              <strong>{rec.title}</strong>
              <p>{rec.description}</p>
            </div>
          ))}
          <h4>Long-term Optimizations</h4>
          {result.longTermOptimizations?.map((rec: any, i: number) => (
            <div key={i} className="recommendation-card">
              <div className="rec-header">
                <span className="category">{rec.category}</span>
                <span className="savings">Save ~${rec.estimatedSavings}/mo</span>
              </div>
              <strong>{rec.title}</strong>
              <p>{rec.description}</p>
            </div>
          ))}
        </div>
      );
    }
    
    if (activeTab === 'api-docs' && result.openApiSpec) {
      return (
        <div className="code-output">
          <div className="code-header">
            <span>OpenAPI Specification (JSON)</span>
            <div className="code-actions">
              <button onClick={() => copyToClipboard(JSON.stringify(result.openApiSpec, null, 2))}>Copy</button>
              <button onClick={() => downloadFile(JSON.stringify(result.openApiSpec, null, 2), 'openapi.json')}>Download</button>
            </div>
          </div>
          <pre><code>{JSON.stringify(result.openApiSpec, null, 2)}</code></pre>
        </div>
      );
    }
    
    const codeOutputs = Object.entries(result).filter(([key]) => key !== 'ok');
    
    return (
      <div className="code-outputs">
        {codeOutputs.map(([key, value]) => (
          <div key={key} className="code-output">
            <div className="code-header">
              <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="code-actions">
                <button onClick={() => copyToClipboard(value as string)}>Copy</button>
                <button onClick={() => downloadFile(value as string, `${key}.${key.includes('yaml') || key.includes('Chart') ? 'yaml' : key.includes('json') ? 'json' : key.includes('Dockerfile') ? '' : 'txt'}`)}>
                  Download
                </button>
              </div>
            </div>
            <pre><code>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</code></pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="devops-panel">
      <h2>DevOps & Automation</h2>
      <p className="panel-description">Generate infrastructure, CI/CD, documentation, and security configurations</p>
      
      <div className="devops-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`devops-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setResult(null); setSelectedType('all'); }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="devops-content">
        {renderTabContent()}
        {renderResults()}
      </div>
    </div>
  );
}
