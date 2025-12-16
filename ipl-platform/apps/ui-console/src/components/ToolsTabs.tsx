import { useState, useRef, useEffect } from 'react';
import './ToolsTabs.css';

interface ToolsTabsProps {
  projectId: string;
  files: Array<{ path: string; content: string; type: string }>;
  consoleLogs: string[];
  appStatus: { status: string; port: number | null; logs: string[] };
  onClearConsole: () => void;
}

interface Tab {
  id: string;
  name: string;
  icon: string;
  closable: boolean;
}

const AVAILABLE_TOOLS = [
  { id: 'preview', name: 'Preview', icon: '🖥️', description: 'Preview your App' },
  { id: 'console', name: 'Console', icon: '⌨️', description: 'View terminal output' },
  { id: 'git', name: 'Git', icon: '⎇', description: 'Version control for your App' },
  { id: 'database', name: 'Database', icon: '🗄️', description: 'Stores structured data' },
  { id: 'files', name: 'Files', icon: '📁', description: 'Browse project files' },
  { id: 'search', name: 'Code Search', icon: '🔍', description: 'Search through code' },
  { id: 'secrets', name: 'Secrets', icon: '🔐', description: 'Store sensitive information' },
  { id: 'security', name: 'Security Scanner', icon: '🛡️', description: 'Scan for vulnerabilities' },
  { id: 'integrations', name: 'Integrations', icon: '🔗', description: 'Connect to services' },
  { id: 'assistant', name: 'Assistant', icon: '🤖', description: 'AI answers and edits' },
  { id: 'playground', name: 'Playground', icon: '🧪', description: 'Test agents and automations' },
];

export function ToolsTabs({ 
  projectId: _projectId, 
  files,
  consoleLogs,
  appStatus,
  onClearConsole
}: ToolsTabsProps) {
  void _projectId;
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'preview', name: 'Preview', icon: '🖥️', closable: false },
    { id: 'console', name: 'Console', icon: '⌨️', closable: false },
    { id: 'git', name: 'Git', icon: '⎇', closable: true },
  ]);
  const [activeTab, setActiveTab] = useState('preview');
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowToolPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTab = (tool: typeof AVAILABLE_TOOLS[0]) => {
    if (!tabs.find(t => t.id === tool.id)) {
      setTabs([...tabs, { ...tool, closable: true }]);
    }
    setActiveTab(tool.id);
    setShowToolPicker(false);
    setSearchQuery('');
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  const filteredTools = AVAILABLE_TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const existingTabIds = tabs.map(t => t.id);

  return (
    <div className="tools-tabs-container">
      <div className="tabs-header">
        <div className="tabs-list">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
              {tab.closable && (
                <button 
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button 
            className="add-tab-btn"
            onClick={() => setShowToolPicker(true)}
          >
            +
          </button>
        </div>
        
        {showToolPicker && (
          <div className="tool-picker" ref={pickerRef}>
            <input
              type="text"
              placeholder="Search for tools & files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="tool-search"
            />
            <div className="tool-list">
              {existingTabIds.length > 0 && (
                <div className="tool-section">
                  <div className="section-label">Jump to existing tab</div>
                  {tabs.map(tab => (
                    <div 
                      key={tab.id}
                      className="tool-item existing"
                      onClick={() => { setActiveTab(tab.id); setShowToolPicker(false); }}
                    >
                      <span className="tool-icon">{tab.icon}</span>
                      <div className="tool-info">
                        <span className="tool-name">{tab.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="tool-section">
                <div className="section-label">Suggested</div>
                {filteredTools.map(tool => (
                  <div 
                    key={tool.id}
                    className={`tool-item ${existingTabIds.includes(tool.id) ? 'disabled' : ''}`}
                    onClick={() => !existingTabIds.includes(tool.id) && addTab(tool)}
                  >
                    <span className="tool-icon">{tool.icon}</span>
                    <div className="tool-info">
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-desc">{tool.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tabs-content">
        {activeTab === 'preview' && (
          <div className="tab-content preview-content">
            <div className="preview-status-bar">
              <span className={`status-dot ${appStatus.status}`}></span>
              <span>{appStatus.status === 'running' ? 'App is running' : 'App not running'}</span>
              {appStatus.port && <span className="port-badge">:{appStatus.port}</span>}
            </div>
            <div className="preview-frame">
              {appStatus.status === 'running' && appStatus.port ? (
                <iframe 
                  src={`http://localhost:${appStatus.port}`}
                  title="App Preview"
                />
              ) : (
                <div className="preview-empty">
                  <div className="empty-icon">🖥️</div>
                  <p>Start your app to see the preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="tab-content console-content">
            <div className="console-toolbar">
              <button onClick={onClearConsole}>Clear</button>
            </div>
            <div className="console-output">
              {consoleLogs.length === 0 ? (
                <div className="console-empty">No output yet...</div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`log-line ${
                      log.includes('ERROR') ? 'error' : 
                      log.includes('SUCCESS') ? 'success' : ''
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="tab-content git-content">
            <div className="git-header">
              <h3>Version Control</h3>
            </div>
            <div className="git-section">
              <h4>Changes</h4>
              <p className="no-changes">No uncommitted changes</p>
            </div>
            <div className="git-actions">
              <button className="git-btn primary">Commit</button>
              <button className="git-btn">Push</button>
              <button className="git-btn">Pull</button>
            </div>
            <div className="git-section">
              <h4>Recent Commits</h4>
              <div className="commit-list">
                <p className="no-commits">No commits yet</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="tab-content database-content">
            <div className="database-header">
              <h3>Database</h3>
              <span className="db-status connected">PostgreSQL Connected</span>
            </div>
            <div className="database-actions">
              <button className="db-btn">View Tables</button>
              <button className="db-btn">Run Query</button>
              <button className="db-btn">Import Data</button>
            </div>
            <div className="database-info">
              <p>Stores structured data such as user profiles, records, and product catalogs.</p>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="tab-content files-content">
            <div className="files-header">
              <h3>Project Files</h3>
              <span className="file-count">{files.length} files</span>
            </div>
            <div className="files-tree">
              {files.length === 0 ? (
                <div className="files-empty">No files generated yet</div>
              ) : (
                files.map((file, i) => (
                  <div key={i} className="file-item">
                    <span className="file-icon">
                      {file.path.endsWith('.ts') ? '📘' :
                       file.path.endsWith('.tsx') ? '⚛️' :
                       file.path.endsWith('.css') ? '🎨' :
                       file.path.endsWith('.json') ? '📋' : '📄'}
                    </span>
                    <span className="file-path">{file.path}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="tab-content search-content">
            <div className="search-header">
              <input 
                type="text" 
                placeholder="Search in files..."
                className="code-search-input"
              />
            </div>
            <div className="search-results">
              <p className="search-hint">Enter a search term to find matches in your code</p>
            </div>
          </div>
        )}

        {activeTab === 'secrets' && (
          <div className="tab-content secrets-content">
            <div className="secrets-header">
              <h3>Secrets</h3>
            </div>
            <p className="secrets-desc">Store sensitive information (like API keys) securely in your App</p>
            <div className="secrets-list">
              <div className="secret-item">
                <span className="secret-key">DATABASE_URL</span>
                <span className="secret-value">••••••••</span>
              </div>
            </div>
            <div className="add-secret-form">
              <input type="text" placeholder="KEY" />
              <input type="password" placeholder="Value" />
              <button>Add</button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="tab-content security-content">
            <div className="security-header">
              <h3>Security Scanner</h3>
            </div>
            <p>Scan your app for vulnerabilities</p>
            <button className="scan-btn">Run Security Scan</button>
            <div className="scan-results">
              <p className="no-issues">No vulnerabilities found</p>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="tab-content integrations-content">
            <div className="integrations-header">
              <h3>Integrations</h3>
            </div>
            <p>Connect to Replit-native and external services</p>
            <div className="integrations-list">
              <div className="integration-item">
                <span className="int-icon">🤖</span>
                <span className="int-name">OpenAI</span>
                <button className="connect-btn">Connect</button>
              </div>
              <div className="integration-item">
                <span className="int-icon">💳</span>
                <span className="int-name">Stripe</span>
                <button className="connect-btn">Connect</button>
              </div>
              <div className="integration-item">
                <span className="int-icon">📧</span>
                <span className="int-name">SendGrid</span>
                <button className="connect-btn">Connect</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="tab-content assistant-content">
            <div className="assistant-header">
              <h3>AI Assistant</h3>
            </div>
            <p>Assistant answers questions, refines code, and makes precise edits.</p>
            <div className="assistant-chat">
              <p className="assistant-hint">Ask the assistant anything about your project...</p>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="tab-content playground-content">
            <div className="playground-header">
              <h3>Playground</h3>
            </div>
            <p>View and test agents and automations created by the AI Agent.</p>
            <div className="playground-area">
              <p className="playground-hint">No automations created yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
