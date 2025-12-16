import { useState, useEffect } from 'react';
import './ProjectBuilder.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';

interface BenchmarkingParam {
  key: string;
  label: string;
  type: 'number' | 'select';
  options?: Array<{ value: number; label: string }>;
  default: number;
  unit?: string;
  description: string;
}

interface DomainProfile {
  id: string;
  name: string;
  description: string;
  parameters: BenchmarkingParam[];
}

interface Module {
  name: string;
  description: string;
  status: string;
  tables: Array<{ name: string; columns: any[] }>;
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
  previewStatus: { status: string; url?: string };
  applicationVerified: string;
  modules: Module[];
  issues: Issue[];
}

interface ProjectBuilderProps {
  onClose: () => void;
}

export default function ProjectBuilder({ onClose }: ProjectBuilderProps) {
  const [phase, setPhase] = useState<'setup' | 'benchmarking' | 'building' | 'preview' | 'infrastructure'>('setup');
  const [domains, setDomains] = useState<DomainProfile[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [domainProfile, setDomainProfile] = useState<DomainProfile | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [benchmarkValues, setBenchmarkValues] = useState<Record<string, number>>({});
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; message: string }>>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [infrastructureRec, setInfrastructureRec] = useState<any>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/domains/benchmarking`);
      const data = await res.json();
      if (data.ok) {
        setDomains(data.domains);
      }
    } catch (e) {
      console.error('Failed to fetch domains:', e);
    }
  };

  const selectDomain = async (domainId: string) => {
    setSelectedDomain(domainId);
    try {
      const res = await fetch(`${API_BASE}/api/domains/${domainId}/benchmarking`);
      const data = await res.json();
      if (data.ok) {
        setDomainProfile(data);
        const defaults: Record<string, number> = {};
        data.parameters.forEach((p: BenchmarkingParam) => {
          defaults[p.key] = p.default;
        });
        setBenchmarkValues(defaults);
      }
    } catch (e) {
      console.error('Failed to fetch domain profile:', e);
    }
  };

  const createProject = async () => {
    if (!projectName || !selectedDomain) {
      setError('Please enter a project name and select a domain');
      return;
    }
    setLoading(true);
    setError('');
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
        setPhase('benchmarking');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create project');
    }
    setLoading(false);
  };

  const saveBenchmarking = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/benchmarking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchmarking: benchmarkValues })
      });
      const data = await res.json();
      if (data.ok) {
        setRecommendation(data.recommendation);
        setPhase('building');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !project) return;
    const message = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', message }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.ok) {
        setChatHistory(prev => [...prev, { role: 'assistant', message: data.message }]);
        await refreshProject();
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', message: `Error: ${data.error}` }]);
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', message: `Error: ${e.message}` }]);
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
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        await refreshProject();
        setPhase('preview');
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const verifyApplication = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/verify-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        await getInfrastructureRecommendations();
        setPhase('infrastructure');
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
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

  return (
    <div className="project-builder-overlay">
      <div className="project-builder-container">
        <div className="project-builder-header">
          <h1>AI Project Builder</h1>
          <p>Build your application step by step with AI assistance</p>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>

        <div className="phase-indicator">
          {['setup', 'benchmarking', 'building', 'preview', 'infrastructure'].map((p, i) => (
            <div key={p} className={`phase-step ${phase === p ? 'active' : ''} ${['setup', 'benchmarking', 'building', 'preview', 'infrastructure'].indexOf(phase) > i ? 'completed' : ''}`}>
              <span className="phase-number">{i + 1}</span>
              <span className="phase-label">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
            </div>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="project-builder-content">
          {phase === 'setup' && (
            <div className="setup-phase">
              <h2>Create Your Project</h2>
              
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g., Smart Grid AMI System"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Select Domain</label>
                <div className="domain-grid">
                  {domains.map(d => (
                    <div 
                      key={d.id} 
                      className={`domain-card ${selectedDomain === d.id ? 'selected' : ''}`}
                      onClick={() => selectDomain(d.id)}
                    >
                      <h3>{d.name}</h3>
                      <p>{d.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                className="primary-btn" 
                onClick={createProject}
                disabled={loading || !projectName || !selectedDomain}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          )}

          {phase === 'benchmarking' && domainProfile && (
            <div className="benchmarking-phase">
              <h2>Configure Scale & Benchmarking</h2>
              <p>Set the scale parameters for your {domainProfile.name} application</p>

              <div className="benchmark-params">
                {domainProfile.parameters.map(param => (
                  <div key={param.key} className="benchmark-param">
                    <label>{param.label}</label>
                    <p className="param-desc">{param.description}</p>
                    {param.options ? (
                      <select
                        value={benchmarkValues[param.key] || param.default}
                        onChange={e => setBenchmarkValues(prev => ({ ...prev, [param.key]: parseInt(e.target.value) }))}
                      >
                        {param.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={benchmarkValues[param.key] || param.default}
                        onChange={e => setBenchmarkValues(prev => ({ ...prev, [param.key]: parseInt(e.target.value) }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button 
                className="primary-btn" 
                onClick={saveBenchmarking}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze & Continue'}
              </button>
            </div>
          )}

          {phase === 'building' && project && (
            <div className="building-phase">
              <div className="building-sidebar">
                <h3>Project: {project.name}</h3>
                
                {recommendation && (
                  <div className="recommendation-card">
                    <h4>AI Recommendations</h4>
                    <div className="rec-item">
                      <span>Database:</span>
                      <strong>{recommendation.database}</strong>
                    </div>
                    <div className="rec-item">
                      <span>Storage:</span>
                      <strong>{formatNumber(recommendation.estimatedStorageGB)} GB</strong>
                    </div>
                    <p className="rec-reason">{recommendation.reason}</p>
                  </div>
                )}

                <div className="modules-list">
                  <h4>Modules ({project.modules?.length || 0})</h4>
                  {project.modules?.map((m, i) => (
                    <div key={i} className={`module-item ${m.status}`}>
                      <span className="module-status">{m.status === 'completed' ? 'done' : 'pending'}</span>
                      <span className="module-name">{m.name}</span>
                      <span className="module-tables">{m.tables?.length || 0} tables</span>
                    </div>
                  ))}
                </div>

                {project.modules?.length > 0 && (
                  <button className="secondary-btn" onClick={startPreview}>
                    Start Preview
                  </button>
                )}
              </div>

              <div className="chat-area">
                <div className="chat-messages">
                  {chatHistory.length === 0 && (
                    <div className="chat-welcome">
                      <h3>AI Development Agent</h3>
                      <p>Tell me what modules to build. For example:</p>
                      <ul>
                        <li>"Build the meter management module"</li>
                        <li>"Add a readings analytics module with alerts"</li>
                        <li>"What modules do I need for this domain?"</li>
                      </ul>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                      <div className="message-content">{msg.message}</div>
                    </div>
                  ))}
                  {loading && <div className="chat-message assistant loading">Thinking...</div>}
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
                  <button onClick={sendMessage} disabled={loading || !chatInput.trim()}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'preview' && project && (
            <div className="preview-phase">
              <div className="preview-header">
                <h2>Application Preview</h2>
                <p>Test your application and report any issues</p>
              </div>

              <div className="preview-content">
                <div className="preview-frame">
                  {project.previewStatus?.url ? (
                    <iframe src={project.previewStatus.url} title="App Preview" />
                  ) : (
                    <div className="preview-placeholder">
                      <p>Preview URL: {project.previewStatus?.url || 'Building...'}</p>
                    </div>
                  )}
                </div>

                <div className="preview-sidebar">
                  <div className="modules-summary">
                    <h4>Built Modules</h4>
                    {project.modules?.map((m, i) => (
                      <div key={i} className="module-summary-item">
                        <strong>{m.name}</strong>
                        <span>{m.tables?.length} tables, {m.apis?.length} APIs</span>
                      </div>
                    ))}
                  </div>

                  <div className="issues-section">
                    <h4>Issues ({project.issues?.length || 0})</h4>
                    {project.issues?.map((issue, i) => (
                      <div key={i} className={`issue-item ${issue.status}`}>
                        <span className="issue-type">{issue.type}</span>
                        <span className="issue-message">{issue.message}</span>
                        <span className="issue-status">{issue.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="preview-actions">
                    <button className="secondary-btn" onClick={() => setPhase('building')}>
                      Continue Building
                    </button>
                    <button 
                      className="primary-btn" 
                      onClick={verifyApplication}
                      disabled={loading}
                    >
                      App Works - Proceed to Infrastructure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === 'infrastructure' && infrastructureRec && (
            <div className="infrastructure-phase">
              <h2>Infrastructure Recommendations</h2>
              <p>Based on your benchmarking: {formatNumber(infrastructureRec.benchmarking?.recordsPerDay || 0)} records/day</p>

              <div className="infra-grid">
                <div className="infra-card">
                  <h3>Compute</h3>
                  <div className="infra-details">
                    <div className="infra-row">
                      <span>Tier:</span>
                      <strong className="tier-badge">{infrastructureRec.infrastructure.tier}</strong>
                    </div>
                    <div className="infra-row">
                      <span>CPU:</span>
                      <strong>{infrastructureRec.infrastructure.compute.cpu} cores</strong>
                    </div>
                    <div className="infra-row">
                      <span>Memory:</span>
                      <strong>{infrastructureRec.infrastructure.compute.memoryGB} GB</strong>
                    </div>
                    <div className="infra-row">
                      <span>Replicas:</span>
                      <strong>{infrastructureRec.infrastructure.compute.replicas}</strong>
                    </div>
                  </div>
                </div>

                <div className="infra-card">
                  <h3>Database</h3>
                  <div className="infra-details">
                    <div className="infra-row">
                      <span>Type:</span>
                      <strong>{infrastructureRec.infrastructure.database.type}</strong>
                    </div>
                    <div className="infra-row">
                      <span>Storage:</span>
                      <strong>{formatNumber(infrastructureRec.infrastructure.database.storageGB)} GB</strong>
                    </div>
                    <div className="infra-row">
                      <span>IOPS:</span>
                      <strong>{formatNumber(infrastructureRec.infrastructure.database.iops)}</strong>
                    </div>
                  </div>
                </div>

                {infrastructureRec.infrastructure.caching && (
                  <div className="infra-card">
                    <h3>Caching</h3>
                    <div className="infra-details">
                      <div className="infra-row">
                        <span>Type:</span>
                        <strong>{infrastructureRec.infrastructure.caching.type}</strong>
                      </div>
                      <div className="infra-row">
                        <span>Memory:</span>
                        <strong>{infrastructureRec.infrastructure.caching.memoryGB} GB</strong>
                      </div>
                    </div>
                  </div>
                )}

                {infrastructureRec.infrastructure.messageQueue && (
                  <div className="infra-card">
                    <h3>Message Queue</h3>
                    <div className="infra-details">
                      <div className="infra-row">
                        <span>Type:</span>
                        <strong>{infrastructureRec.infrastructure.messageQueue.type}</strong>
                      </div>
                      <div className="infra-row">
                        <span>Partitions:</span>
                        <strong>{infrastructureRec.infrastructure.messageQueue.partitions}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="cloud-costs">
                <h3>Estimated Monthly Costs</h3>
                <div className="cost-cards">
                  {Object.entries(infrastructureRec.cloudCosts).map(([provider, cost]: [string, any]) => (
                    <div key={provider} className="cost-card">
                      <span className="provider-name">{provider.toUpperCase()}</span>
                      <span className="cost-amount">${formatNumber(Math.round(cost.monthly))}/mo</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="next-steps">
                <h3>Next Steps</h3>
                <ul>
                  {infrastructureRec.nextSteps?.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
