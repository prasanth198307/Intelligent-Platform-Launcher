import { useState, useEffect, useRef } from 'react';
import './ProjectBuilder.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';

const ALL_DOMAINS = [
  { id: 'ami', name: 'AMI / Smart Metering', icon: '⚡', entityLabel: 'Number of Devices / Meters', transactionLabel: 'Readings per Day' },
  { id: 'cis', name: 'CIS (Customer Information)', icon: '👥', entityLabel: 'Number of Customer Accounts', transactionLabel: 'Transactions per Day' },
  { id: 'crm', name: 'CRM (Customer Relationship)', icon: '🤝', entityLabel: 'Number of Customers', transactionLabel: 'Interactions per Day' },
  { id: 'ivrs', name: 'IVRS (Voice Response)', icon: '📞', entityLabel: 'Concurrent Call Capacity', transactionLabel: 'Calls per Day' },
  { id: 'contactcenter', name: 'Contact Center / CCAI', icon: '🎧', entityLabel: 'Number of Agents', transactionLabel: 'Interactions per Day' },
  { id: 'banking', name: 'Banking & Finance', icon: '🏦', entityLabel: 'Number of Accounts', transactionLabel: 'Transactions per Day' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', entityLabel: 'Number of Policies', transactionLabel: 'Claims per Day' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', entityLabel: 'Number of Patients', transactionLabel: 'Encounters per Day' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭', entityLabel: 'Number of Machines', transactionLabel: 'Data Points per Day' },
  { id: 'retail', name: 'Retail & E-commerce', icon: '🛒', entityLabel: 'Number of Products', transactionLabel: 'Orders per Day' },
  { id: 'legal', name: 'Legal & Law Firms', icon: '⚖️', entityLabel: 'Number of Cases', transactionLabel: 'Documents per Day' },
  { id: 'accounting', name: 'Accounting & Finance', icon: '📊', entityLabel: 'Number of Clients', transactionLabel: 'Transactions per Day' },
  { id: 'erp', name: 'ERP (Enterprise Resource)', icon: '🏢', entityLabel: 'Number of Users', transactionLabel: 'Transactions per Day' },
  { id: 'education', name: 'Education / EdTech', icon: '🎓', entityLabel: 'Number of Students', transactionLabel: 'Activities per Day' },
  { id: 'realestate', name: 'Real Estate / Property', icon: '🏠', entityLabel: 'Number of Properties', transactionLabel: 'Transactions per Day' },
  { id: 'logistics', name: 'Logistics / Supply Chain', icon: '🚚', entityLabel: 'Number of Shipments', transactionLabel: 'Events per Day' },
  { id: 'hospitality', name: 'Hospitality / Hotels', icon: '🏨', entityLabel: 'Number of Rooms', transactionLabel: 'Bookings per Day' },
  { id: 'government', name: 'Government / Public Sector', icon: '🏛️', entityLabel: 'Number of Citizens', transactionLabel: 'Services per Day' },
  { id: 'telecom', name: 'Telecom / Communications', icon: '📡', entityLabel: 'Number of Subscribers', transactionLabel: 'CDRs per Day' },
  { id: 'pharma', name: 'Pharma / Life Sciences', icon: '💊', entityLabel: 'Number of Products', transactionLabel: 'Records per Day' },
  { id: 'agriculture', name: 'Agriculture / AgriTech', icon: '🌾', entityLabel: 'Number of Farms', transactionLabel: 'Readings per Day' },
  { id: 'media', name: 'Media & Entertainment', icon: '🎬', entityLabel: 'Number of Assets', transactionLabel: 'Streams per Day' },
  { id: 'energy', name: 'Energy / Oil & Gas', icon: '🛢️', entityLabel: 'Number of Wells/Sites', transactionLabel: 'Readings per Day' },
  { id: 'automotive', name: 'Automotive', icon: '🚗', entityLabel: 'Number of Vehicles', transactionLabel: 'Events per Day' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', entityLabel: 'Number of Players', transactionLabel: 'Sessions per Day' },
  { id: 'custom', name: 'Custom Domain', icon: '⚙️', entityLabel: 'Number of Entities', transactionLabel: 'Transactions per Day' },
];

interface Module {
  name: string;
  description: string;
  status: string;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string; primaryKey?: boolean; references?: string }> }>;
  apis: Array<{ method: string; path: string; description: string }>;
  screens: Array<{ name: string; type: string; route: string }>;
}

interface Issue {
  id: string;
  type: string;
  source: string;
  message: string;
  status: string;
  aiAnalysis?: string;
  suggestedFix?: string;
}

interface Project {
  projectId: string;
  name: string;
  description: string;
  domain: string;
  database: string;
  status: string;
  benchmarking: any;
  previewStatus: { status: string; url?: string; logs?: string[] };
  applicationVerified: string;
  modules: Module[];
  issues: Issue[];
  generatedFiles: Array<{ path: string; content: string; type: string }>;
}

interface ProjectBuilderProps {
  onClose: () => void;
}

type Phase = 'setup' | 'benchmarking' | 'building' | 'preview' | 'infrastructure' | 'testing' | 'deployment';

export default function ProjectBuilder({ onClose }: ProjectBuilderProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [entityCount, setEntityCount] = useState('100000');
  const [transactionCount, setTransactionCount] = useState('1000000');
  const [concurrentUsers, setConcurrentUsers] = useState('100');
  const [dataRetention, setDataRetention] = useState('5');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; message: string; timestamp?: string }>>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [infrastructureRec, setInfrastructureRec] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'console' | 'tables' | 'apis' | 'files'>('chat');
  const [issueInput, setIssueInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const getDomainConfig = () => ALL_DOMAINS.find(d => d.id === selectedDomain);

  const createProject = async () => {
    if (!projectName || !selectedDomain) {
      setError('Please enter a project name and select a domain');
      return;
    }
    setLoading(true);
    setError('');
    addLog(`Creating project: ${projectName}...`);
    
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          domain: selectedDomain,
          description: projectDescription
        })
      });
      const data = await res.json();
      if (data.ok) {
        setProject(data.project);
        addLog(`Project created: ${data.project.projectId}`);
        setPhase('benchmarking');
      } else {
        setError(data.error || 'Failed to create project');
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create project');
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const saveBenchmarking = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Analyzing benchmarking configuration...');
    
    try {
      const benchmarking = {
        entityCount: parseInt(entityCount),
        transactionsPerDay: parseInt(transactionCount),
        concurrentUsers: parseInt(concurrentUsers),
        dataRetentionYears: parseInt(dataRetention),
      };
      
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/benchmarking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchmarking })
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Database recommended: ${data.recommendation.database}`);
        addLog(`Estimated storage: ${formatNumber(data.recommendation.estimatedStorageGB)} GB`);
        addLog(`Reason: ${data.recommendation.reason}`);
        await refreshProject();
        setPhase('building');
      }
    } catch (e: any) {
      setError(e.message);
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !project) return;
    const message = chatInput;
    setChatInput('');
    const timestamp = new Date().toLocaleTimeString();
    setChatHistory(prev => [...prev, { role: 'user', message, timestamp }]);
    addLog(`User: ${message}`);
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.ok) {
        setChatHistory(prev => [...prev, { role: 'assistant', message: data.message, timestamp: new Date().toLocaleTimeString() }]);
        addLog(`AI: ${data.message}`);
        if (data.nextSteps) {
          data.nextSteps.forEach((step: string) => addLog(`  → ${step}`));
        }
        await refreshProject();
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', message: `Error: ${data.error}`, timestamp: new Date().toLocaleTimeString() }]);
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', message: `Error: ${e.message}`, timestamp: new Date().toLocaleTimeString() }]);
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const refreshProject = async () => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}`);
      const data = await res.json();
      if (data.ok) {
        setProject(data.project);
      }
    } catch (e) {
      console.error('Failed to refresh project:', e);
    }
  };

  const startPreview = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Starting application preview...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog('Preview started successfully');
        addLog(`Preview URL: ${data.preview.url}`);
        await refreshProject();
        setPhase('preview');
      } else {
        setError(data.error);
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      setError(e.message);
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const reportIssue = async () => {
    if (!issueInput.trim() || !project) return;
    setLoading(true);
    addLog(`Reporting issue: ${issueInput}`);
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', source: 'user', message: issueInput })
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Issue reported: ${data.issue.id}`);
        setIssueInput('');
        await refreshProject();
        
        addLog('AI analyzing issue...');
        const fixRes = await fetch(`${API_BASE}/api/projects/${project.projectId}/issues/${data.issue.id}/fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const fixData = await fixRes.json();
        if (fixData.ok) {
          addLog('AI analysis complete');
          addLog(`Suggested fix: ${fixData.analysis || 'See details'}`);
          await refreshProject();
        }
      }
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const verifyApplication = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Verifying application...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/verify-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog('Application verified successfully!');
        addLog('Fetching infrastructure recommendations...');
        await getInfrastructureRecommendations();
        setPhase('infrastructure');
      } else {
        setError(data.error);
        addLog(`ERROR: ${data.error}`);
      }
    } catch (e: any) {
      setError(e.message);
      addLog(`ERROR: ${e.message}`);
    }
    setLoading(false);
  };

  const getInfrastructureRecommendations = async () => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/infrastructure/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        setInfrastructureRec(data);
        addLog(`Infrastructure tier: ${data.infrastructure.tier}`);
        addLog(`Compute: ${data.infrastructure.compute.cpu} CPU, ${data.infrastructure.compute.memoryGB}GB RAM`);
        addLog(`Database: ${data.infrastructure.database.type}`);
      }
    } catch (e) {
      console.error('Failed to get infrastructure recommendations:', e);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const phases: { id: Phase; label: string; icon: string }[] = [
    { id: 'setup', label: 'Setup', icon: '1' },
    { id: 'benchmarking', label: 'Benchmarking', icon: '2' },
    { id: 'building', label: 'Building', icon: '3' },
    { id: 'preview', label: 'Preview', icon: '4' },
    { id: 'infrastructure', label: 'Infrastructure', icon: '5' },
    { id: 'testing', label: 'Testing', icon: '6' },
    { id: 'deployment', label: 'Deployment', icon: '7' },
  ];

  const completedModules = project?.modules?.filter(m => m.status === 'completed' || m.tables?.length > 0) || [];
  const allTables = completedModules.flatMap(m => m.tables || []);
  const allApis = completedModules.flatMap(m => m.apis || []);

  return (
    <div className="project-builder-overlay">
      <div className="project-builder-container">
        <div className="project-builder-header">
          <div className="header-left">
            <h1>AI Project Builder</h1>
            <p>Build your application step by step with AI assistance</p>
          </div>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>

        <div className="phase-indicator">
          {phases.map((p, i) => (
            <div 
              key={p.id} 
              className={`phase-step ${phase === p.id ? 'active' : ''} ${phases.findIndex(ph => ph.id === phase) > i ? 'completed' : ''}`}
              onClick={() => phases.findIndex(ph => ph.id === phase) >= i && setPhase(p.id)}
            >
              <span className="phase-number">{p.icon}</span>
              <span className="phase-label">{p.label}</span>
            </div>
          ))}
        </div>

        {error && <div className="error-banner">{error} <button onClick={() => setError('')}>x</button></div>}

        <div className="project-builder-content">
          {phase === 'setup' && (
            <div className="setup-phase">
              <h2>Create Your Project</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g., Smart Grid Management System"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={projectDescription}
                    onChange={e => setProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Select Domain / Industry ({ALL_DOMAINS.length} available)</label>
                <div className="domain-grid">
                  {ALL_DOMAINS.map(d => (
                    <div 
                      key={d.id} 
                      className={`domain-card ${selectedDomain === d.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDomain(d.id)}
                    >
                      <span className="domain-icon">{d.icon}</span>
                      <span className="domain-name">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                className="primary-btn" 
                onClick={createProject}
                disabled={loading || !projectName || !selectedDomain}
              >
                {loading ? 'Creating...' : 'Create Project & Continue'}
              </button>
            </div>
          )}

          {phase === 'benchmarking' && (
            <div className="benchmarking-phase">
              <h2>Configure Scale & Benchmarking</h2>
              <p>Set the scale parameters for your {getDomainConfig()?.name} application</p>

              <div className="benchmark-grid">
                <div className="benchmark-param">
                  <label>{getDomainConfig()?.entityLabel || 'Number of Entities'}</label>
                  <input
                    type="text"
                    value={entityCount}
                    onChange={e => setEntityCount(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div className="benchmark-param">
                  <label>{getDomainConfig()?.transactionLabel || 'Transactions per Day'}</label>
                  <input
                    type="text"
                    value={transactionCount}
                    onChange={e => setTransactionCount(e.target.value)}
                    placeholder="1000000"
                  />
                </div>
                <div className="benchmark-param">
                  <label>Concurrent Users</label>
                  <input
                    type="text"
                    value={concurrentUsers}
                    onChange={e => setConcurrentUsers(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="benchmark-param">
                  <label>Data Retention (Years)</label>
                  <input
                    type="text"
                    value={dataRetention}
                    onChange={e => setDataRetention(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>

              <button 
                className="primary-btn" 
                onClick={saveBenchmarking}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze & Start Building'}
              </button>
            </div>
          )}

          {phase === 'building' && project && (
            <div className="building-phase">
              <div className="building-main">
                <div className="tabs-header">
                  <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>Chat with AI</button>
                  <button className={activeTab === 'console' ? 'active' : ''} onClick={() => setActiveTab('console')}>Console</button>
                  <button className={activeTab === 'tables' ? 'active' : ''} onClick={() => setActiveTab('tables')}>Tables ({allTables.length})</button>
                  <button className={activeTab === 'apis' ? 'active' : ''} onClick={() => setActiveTab('apis')}>APIs ({allApis.length})</button>
                  <button className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>Files</button>
                </div>

                <div className="tab-content">
                  {activeTab === 'chat' && (
                    <div className="chat-area">
                      <div className="chat-messages">
                        {chatHistory.length === 0 && (
                          <div className="chat-welcome">
                            <h3>AI Development Agent</h3>
                            <p>Tell me what modules to build. For example:</p>
                            <ul>
                              <li>"Build the {selectedDomain === 'ami' ? 'meter management' : 'user management'} module"</li>
                              <li>"What modules do I need for this domain?"</li>
                              <li>"Add authentication with JWT"</li>
                            </ul>
                          </div>
                        )}
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`chat-message ${msg.role}`}>
                            <div className="message-time">{msg.timestamp}</div>
                            <div className="message-content">{msg.message}</div>
                          </div>
                        ))}
                        {loading && <div className="chat-message assistant loading">Thinking...</div>}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="chat-input-area">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && sendMessage()}
                          placeholder="Tell the AI what to build..."
                          disabled={loading}
                        />
                        <button onClick={sendMessage} disabled={loading || !chatInput.trim()}>Send</button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'console' && (
                    <div className="console-area">
                      <div className="console-output">
                        {consoleLogs.map((log, i) => (
                          <div key={i} className={`console-line ${log.includes('ERROR') ? 'error' : log.includes('AI:') ? 'ai' : ''}`}>
                            {log}
                          </div>
                        ))}
                        <div ref={consoleEndRef} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'tables' && (
                    <div className="tables-area">
                      {allTables.length === 0 ? (
                        <div className="empty-state">No tables generated yet. Ask the AI to build modules.</div>
                      ) : (
                        <div className="tables-list">
                          {allTables.map((table, i) => (
                            <div key={i} className="table-card">
                              <h4>{table.name}</h4>
                              <table className="schema-table">
                                <thead>
                                  <tr><th>Column</th><th>Type</th><th>Key</th></tr>
                                </thead>
                                <tbody>
                                  {table.columns?.map((col, j) => (
                                    <tr key={j}>
                                      <td>{col.name}</td>
                                      <td>{col.type}</td>
                                      <td>{col.primaryKey ? 'PK' : col.references ? `FK → ${col.references}` : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'apis' && (
                    <div className="apis-area">
                      {allApis.length === 0 ? (
                        <div className="empty-state">No APIs generated yet. Ask the AI to build modules.</div>
                      ) : (
                        <div className="apis-list">
                          {allApis.map((api, i) => (
                            <div key={i} className="api-card">
                              <span className={`method ${api.method.toLowerCase()}`}>{api.method}</span>
                              <span className="path">{api.path}</span>
                              <span className="desc">{api.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="files-area">
                      {!project.generatedFiles?.length ? (
                        <div className="empty-state">No files generated yet.</div>
                      ) : (
                        <div className="files-list">
                          {project.generatedFiles.map((file, i) => (
                            <div key={i} className="file-item">{file.path}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="building-sidebar">
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <div className="info-row"><span>Domain:</span><strong>{getDomainConfig()?.name}</strong></div>
                  <div className="info-row"><span>Database:</span><strong>{project.database}</strong></div>
                  <div className="info-row"><span>Status:</span><strong>{project.status}</strong></div>
                </div>

                <div className="modules-list">
                  <h4>Modules ({completedModules.length})</h4>
                  {completedModules.map((m, i) => (
                    <div key={i} className="module-item">
                      <span className="module-status">done</span>
                      <span className="module-name">{m.name}</span>
                      <span className="module-meta">{m.tables?.length || 0}T / {m.apis?.length || 0}A</span>
                    </div>
                  ))}
                </div>

                {completedModules.length > 0 && (
                  <button className="primary-btn full-width" onClick={startPreview}>
                    Start Preview & Test
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === 'preview' && project && (
            <div className="preview-phase">
              <div className="preview-main">
                <div className="preview-frame">
                  <div className="preview-header-bar">
                    <span>Preview: {project.previewStatus?.url || 'Loading...'}</span>
                  </div>
                  <div className="preview-content-area">
                    {project.previewStatus?.url ? (
                      <iframe src={project.previewStatus.url} title="App Preview" />
                    ) : (
                      <div className="preview-placeholder">
                        <p>Application preview is ready for testing.</p>
                        <p>Test your application and report any issues below.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="issue-reporter">
                  <h4>Report Issues for AI to Fix</h4>
                  <div className="issue-input-area">
                    <input
                      type="text"
                      value={issueInput}
                      onChange={e => setIssueInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && reportIssue()}
                      placeholder="Describe the issue (e.g., 'Login button not working')"
                    />
                    <button onClick={reportIssue} disabled={loading || !issueInput.trim()}>Report & Fix</button>
                  </div>
                </div>

                <div className="console-preview">
                  <h4>Console Output</h4>
                  <div className="console-output small">
                    {consoleLogs.slice(-10).map((log, i) => (
                      <div key={i} className={`console-line ${log.includes('ERROR') ? 'error' : ''}`}>{log}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="preview-sidebar">
                <div className="issues-section">
                  <h4>Issues ({project.issues?.length || 0})</h4>
                  {project.issues?.map((issue, i) => (
                    <div key={i} className={`issue-item ${issue.status}`}>
                      <div className="issue-header">
                        <span className={`issue-type ${issue.type}`}>{issue.type}</span>
                        <span className={`issue-status ${issue.status}`}>{issue.status}</span>
                      </div>
                      <div className="issue-message">{issue.message}</div>
                      {issue.aiAnalysis && <div className="issue-fix">AI: {issue.aiAnalysis}</div>}
                    </div>
                  ))}
                </div>

                <div className="preview-actions">
                  <button className="secondary-btn" onClick={() => setPhase('building')}>
                    Back to Building
                  </button>
                  <button className="primary-btn" onClick={verifyApplication} disabled={loading}>
                    App Works - Get Infrastructure
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'infrastructure' && infrastructureRec && (
            <div className="infrastructure-phase">
              <h2>Infrastructure Recommendations</h2>
              <p>Based on your benchmarking and verified application</p>

              <div className="infra-summary">
                <div className="summary-card tier">
                  <span className="label">Tier</span>
                  <span className={`value tier-${infrastructureRec.infrastructure.tier}`}>{infrastructureRec.infrastructure.tier.toUpperCase()}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Modules</span>
                  <span className="value">{infrastructureRec.applicationSummary.modules}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Tables</span>
                  <span className="value">{infrastructureRec.applicationSummary.tables}</span>
                </div>
                <div className="summary-card">
                  <span className="label">APIs</span>
                  <span className="value">{infrastructureRec.applicationSummary.apis}</span>
                </div>
              </div>

              <div className="infra-grid">
                <div className="infra-card">
                  <h3>Compute</h3>
                  <div className="infra-row"><span>CPU:</span><strong>{infrastructureRec.infrastructure.compute.cpu} cores</strong></div>
                  <div className="infra-row"><span>Memory:</span><strong>{infrastructureRec.infrastructure.compute.memoryGB} GB</strong></div>
                  <div className="infra-row"><span>Replicas:</span><strong>{infrastructureRec.infrastructure.compute.replicas}</strong></div>
                </div>
                <div className="infra-card">
                  <h3>Database</h3>
                  <div className="infra-row"><span>Type:</span><strong>{infrastructureRec.infrastructure.database.type}</strong></div>
                  <div className="infra-row"><span>Storage:</span><strong>{formatNumber(infrastructureRec.infrastructure.database.storageGB)} GB</strong></div>
                  <div className="infra-row"><span>IOPS:</span><strong>{formatNumber(infrastructureRec.infrastructure.database.iops)}</strong></div>
                </div>
                {infrastructureRec.infrastructure.caching && (
                  <div className="infra-card">
                    <h3>Caching</h3>
                    <div className="infra-row"><span>Type:</span><strong>{infrastructureRec.infrastructure.caching.type}</strong></div>
                    <div className="infra-row"><span>Memory:</span><strong>{infrastructureRec.infrastructure.caching.memoryGB} GB</strong></div>
                  </div>
                )}
                {infrastructureRec.infrastructure.messageQueue && (
                  <div className="infra-card">
                    <h3>Message Queue</h3>
                    <div className="infra-row"><span>Type:</span><strong>{infrastructureRec.infrastructure.messageQueue.type}</strong></div>
                    <div className="infra-row"><span>Partitions:</span><strong>{infrastructureRec.infrastructure.messageQueue.partitions}</strong></div>
                  </div>
                )}
              </div>

              <div className="cloud-costs">
                <h3>Estimated Monthly Costs</h3>
                <div className="cost-cards">
                  {Object.entries(infrastructureRec.cloudCosts).map(([provider, cost]: [string, any]) => (
                    <div key={provider} className="cost-card">
                      <span className="provider">{provider.toUpperCase()}</span>
                      <span className="amount">${formatNumber(Math.round(cost.monthly))}/mo</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="phase-actions">
                <button className="secondary-btn" onClick={() => setPhase('preview')}>Back to Preview</button>
                <button className="primary-btn" onClick={() => setPhase('testing')}>Proceed to Testing</button>
              </div>
            </div>
          )}

          {phase === 'testing' && (
            <div className="testing-phase">
              <h2>Testing & Quality</h2>
              <div className="testing-grid">
                <div className="testing-card">
                  <h3>Unit Tests</h3>
                  <p>Generate unit tests for all modules</p>
                  <button className="secondary-btn">Generate Tests</button>
                </div>
                <div className="testing-card">
                  <h3>Integration Tests</h3>
                  <p>Generate API integration tests</p>
                  <button className="secondary-btn">Generate Tests</button>
                </div>
                <div className="testing-card">
                  <h3>Load Testing</h3>
                  <p>Generate k6/JMeter scripts</p>
                  <button className="secondary-btn">Generate Scripts</button>
                </div>
                <div className="testing-card">
                  <h3>Security Scan</h3>
                  <p>Run security vulnerability scan</p>
                  <button className="secondary-btn">Run Scan</button>
                </div>
              </div>
              <div className="phase-actions">
                <button className="secondary-btn" onClick={() => setPhase('infrastructure')}>Back</button>
                <button className="primary-btn" onClick={() => setPhase('deployment')}>Proceed to Deployment</button>
              </div>
            </div>
          )}

          {phase === 'deployment' && (
            <div className="deployment-phase">
              <h2>Deployment & Documentation</h2>
              <div className="deployment-grid">
                <div className="deployment-card">
                  <h3>CI/CD Pipeline</h3>
                  <p>Generate GitHub Actions, GitLab CI, Jenkins pipelines</p>
                  <button className="secondary-btn">Generate</button>
                </div>
                <div className="deployment-card">
                  <h3>Docker & Kubernetes</h3>
                  <p>Generate Dockerfile, docker-compose, Helm charts</p>
                  <button className="secondary-btn">Generate</button>
                </div>
                <div className="deployment-card">
                  <h3>Infrastructure as Code</h3>
                  <p>Generate Terraform, CloudFormation</p>
                  <button className="secondary-btn">Generate</button>
                </div>
                <div className="deployment-card">
                  <h3>Documentation</h3>
                  <p>Generate API docs, README, architecture docs</p>
                  <button className="secondary-btn">Generate</button>
                </div>
              </div>
              <div className="phase-actions">
                <button className="secondary-btn" onClick={() => setPhase('testing')}>Back</button>
                <button className="primary-btn" onClick={onClose}>Complete & Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
