import { useState, useEffect, useRef } from 'react';
import './ProjectBuilder.css';
import { AgentChat } from './components/AgentChat';
import { ToolsTabs } from './components/ToolsTabs';

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

type Phase = 'setup' | 'benchmarking' | 'building' | 'preview' | 'infrastructure' | 'testing' | 'deployment';

export default function ProjectBuilder() {
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
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; message: string; timestamp?: string; suggestedModules?: string[] }>>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [infrastructureRec, setInfrastructureRec] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'tables' | 'apis' | 'files' | 'preview'>('console');
  const [issueInput, setIssueInput] = useState('');
  const [appStatus, setAppStatus] = useState<{ status: string; port: number | null; logs: string[] }>({ status: 'not_running', port: null, logs: [] });
  const [useAgenticMode, setUseAgenticMode] = useState(true);
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

  const sendMessage = async (overrideMessage?: string) => {
    const message = overrideMessage || chatInput.trim();
    if (!message || !project) return;
    if (!overrideMessage) setChatInput('');
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
        // Build rich message with suggestions if available
        let richMessage = data.message;
        
        // Handle clarify action - show suggested modules as options
        if (data.action === 'clarify' && data.suggestedModules?.length) {
          richMessage += '\n\n**Suggested modules:**';
          data.suggestedModules.forEach((mod: string) => {
            richMessage += `\n• ${mod}`;
          });
        }
        
        // Show questions if any
        if (data.questions?.length) {
          richMessage += '\n\n**Questions to consider:**';
          data.questions.forEach((q: string) => {
            richMessage += `\n• ${q}`;
          });
        }
        
        // Show suggestions for info action
        if (data.action === 'info' && data.suggestions?.length) {
          richMessage += '\n\n**Suggestions:**';
          data.suggestions.forEach((s: string) => {
            richMessage += `\n• ${s}`;
          });
        }
        
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          message: richMessage, 
          timestamp: new Date().toLocaleTimeString(),
          suggestedModules: data.suggestedModules
        }]);
        addLog(`AI: ${data.message}`);
        
        if (data.nextSteps) {
          data.nextSteps.forEach((step: string) => addLog(`  → ${step}`));
        }
        
        // Handle automation response - auto-switch to Preview and start polling
        if (data.automation?.status === 'started') {
          addLog(`🚀 ${data.automation.message}`);
          setChatHistory(prev => [...prev, { 
            role: 'system', 
            message: '🚀 Building and starting your application automatically...', 
            timestamp: new Date().toLocaleTimeString() 
          }]);
          setActiveTab('preview');
          // Start polling for app status after a short delay
          setTimeout(() => pollAppStatus(), 3000);
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

  const materializeCode = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Generating runnable code files...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/materialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Generated ${data.filesCount} files`);
        addLog(`Project directory: ${data.projectDir}`);
        data.files.forEach((f: any) => addLog(`  + ${f.path}`));
        addLog('');
        addLog('To run the project:');
        addLog(`  1. ${data.commands.install}`);
        addLog(`  2. ${data.commands.migrate}`);
        addLog(`  3. ${data.commands.start}`);
        await refreshProject();
        setActiveTab('files');
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

  const provisionDatabase = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Provisioning database...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/database/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Database provisioned successfully!`);
        addLog(`Created ${data.tables.length} tables:`);
        data.tables.forEach((t: string) => addLog(`  - ${t}`));
        if (data.errors?.length > 0) {
          addLog('Warnings:');
          data.errors.forEach((e: string) => addLog(`  ! ${e}`));
        }
        await refreshProject();
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

  const runApp = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Starting application...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Application starting on port ${data.port}...`);
        setAppStatus({ status: data.status, port: data.port, logs: data.logs || [] });
        setActiveTab('preview');
        pollAppStatus();
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

  const stopApp = async () => {
    if (!project) return;
    setLoading(true);
    addLog('Stopping application...');
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        addLog('Application stopped');
        setAppStatus({ status: 'stopped', port: null, logs: [] });
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const pollAppStatus = async () => {
    if (!project) return;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/projects/${project.projectId}/status`);
        const data = await res.json();
        if (data.ok) {
          setAppStatus({ status: data.status, port: data.port, logs: data.logs || [] });
          if (data.status === 'starting' || data.status === 'running') {
            setTimeout(checkStatus, data.status === 'starting' ? 2000 : 5000);
          }
        }
      } catch (e) {
        console.error('Failed to poll status:', e);
      }
    };
    
    checkStatus();
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
    { id: 'building', label: 'Build & Preview', icon: '3' },
    { id: 'infrastructure', label: 'Infrastructure', icon: '4' },
    { id: 'testing', label: 'Testing', icon: '5' },
    { id: 'deployment', label: 'Deployment', icon: '6' },
  ];

  const completedModules = project?.modules?.filter(m => m.status === 'completed' || m.tables?.length > 0) || [];
  const allTables = completedModules.flatMap(m => m.tables || []);
  const allApis = completedModules.flatMap(m => m.apis || []);

  return (
    <div className="project-builder-page">
      <div className="project-builder-container">
        <div className="project-builder-header">
          <div className="header-left">
            <img src="/logo.png" alt="IPL" className="header-logo" />
            <div>
              <h1>Intelligent Platform Launcher</h1>
              <p>Build production-ready applications with AI assistance</p>
            </div>
          </div>
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
              <div className="chat-panel">
                <div className="chat-header">
                  <h3>Chat with AI Agent</h3>
                  <div className="chat-mode-toggle">
                    <button 
                      className={useAgenticMode ? 'active' : ''} 
                      onClick={() => setUseAgenticMode(true)}
                      title="Claude-like agent with tools, tasks, and self-correction"
                    >
                      Agentic Mode
                    </button>
                    <button 
                      className={!useAgenticMode ? 'active' : ''} 
                      onClick={() => setUseAgenticMode(false)}
                      title="Simple chat interface"
                    >
                      Classic
                    </button>
                  </div>
                  <span className="status-badge">{loading ? 'Thinking...' : 'Ready'}</span>
                </div>

                {useAgenticMode ? (
                  <AgentChat projectId={project.projectId} onModuleBuilt={(mod) => {
                    if (mod && project) {
                      setProject({
                        ...project,
                        modules: [...project.modules, mod]
                      });
                      addLog(`Module built: ${mod.name}`);
                    }
                  }} />
                ) : (
                  <>
                <div className="chat-messages">
                  {chatHistory.length === 0 && (
                    <div className="chat-welcome">
                      <h3>AI Development Agent</h3>
                      <p>Tell me what to build. For example:</p>
                      <ul>
                        <li>"Build the {selectedDomain === 'ami' ? 'meter management' : 'user management'} module"</li>
                        <li>"What modules do I need?"</li>
                        <li>"Add authentication with JWT"</li>
                        <li>"The login button doesn't work" (report issues)</li>
                      </ul>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                      <div className="message-time">{msg.timestamp}</div>
                      <div className="message-content">
                        {msg.message.split('\n').map((line, j) => (
                          <span key={j}>{line}{j < msg.message.split('\n').length - 1 && <br />}</span>
                        ))}
                      </div>
                      {msg.suggestedModules && msg.suggestedModules.length > 0 && (
                        <div className="suggested-modules">
                          {msg.suggestedModules.map((mod, j) => (
                            <button 
                              key={j} 
                              className="module-suggestion-btn"
                              onClick={() => sendMessage(`Build the ${mod} module`)}
                              disabled={loading}
                            >
                              Build {mod}
                            </button>
                          ))}
                        </div>
                      )}
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
                    placeholder="Tell the AI what to build or report issues..."
                    disabled={loading}
                  />
                  <button onClick={() => sendMessage()} disabled={loading || !chatInput.trim()}>Send</button>
                </div>
                  </>
                )}
              </div>

              <div className="tools-panel-container">
                <ToolsTabs
                  projectId={project.projectId}
                  files={project.generatedFiles || []}
                  consoleLogs={consoleLogs}
                  appStatus={appStatus}
                  onClearConsole={() => setConsoleLogs([])}
                />
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
                <button className="primary-btn" onClick={() => { addLog('Project completed!'); setPhase('setup'); setProject(null); }}>Complete & Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileExplorer({ files }: { files: Array<{ path: string; content: string; type: string }> }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['backend', 'frontend']));

  const toggleDir = (dir: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dir)) {
      newExpanded.delete(dir);
    } else {
      newExpanded.add(dir);
    }
    setExpandedDirs(newExpanded);
  };

  const getFileTree = () => {
    const tree: Record<string, any> = {};
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = { type: 'file', path: file.path };
        } else {
          if (!current[part]) current[part] = { type: 'dir', children: {} };
          current = current[part].children;
        }
      });
    });
    return tree;
  };

  const renderTree = (node: Record<string, any>, path: string = '') => {
    return Object.entries(node).sort(([, a], [, b]) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return 0;
    }).map(([name, value]: [string, any]) => {
      const fullPath = path ? `${path}/${name}` : name;
      if (value.type === 'dir') {
        const isExpanded = expandedDirs.has(fullPath);
        return (
          <div key={fullPath}>
            <div className="tree-dir" onClick={() => toggleDir(fullPath)}>
              <span className="tree-icon">{isExpanded ? '📂' : '📁'}</span>
              {name}
            </div>
            {isExpanded && <div className="tree-children">{renderTree(value.children, fullPath)}</div>}
          </div>
        );
      }
      return (
        <div 
          key={value.path} 
          className={`tree-file ${selectedFile === value.path ? 'active' : ''}`}
          onClick={() => setSelectedFile(value.path)}
        >
          <span className="tree-icon">{getFileIcon(name)}</span>
          {name}
        </div>
      );
    });
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return '📘';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '📙';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.html')) return '🌐';
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.env')) return '🔐';
    return '📄';
  };

  const selectedContent = files.find(f => f.path === selectedFile)?.content || '';

  return (
    <div className="file-explorer">
      <div className="file-tree">
        {renderTree(getFileTree())}
      </div>
      <div className="file-content">
        {selectedFile ? (
          <>
            <div className="file-header">
              <span className="file-path">{selectedFile}</span>
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText(selectedContent)}>Copy</button>
            </div>
            <pre className="code-view"><code>{selectedContent}</code></pre>
          </>
        ) : (
          <div className="no-file-selected">Select a file to view its contents</div>
        )}
      </div>
    </div>
  );
}
