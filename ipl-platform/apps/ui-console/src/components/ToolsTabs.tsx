import { useState, useRef, useEffect, useCallback } from 'react';
import './ToolsTabs.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';

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

interface GitStatus {
  branch: string;
  changedFiles: Array<{ status: string; file: string; statusLabel: string }>;
  changedCount: number;
  commits: Array<{ hash: string; message: string; time: string; author: string }>;
}

interface Secret {
  key: string;
  masked: string;
  hasValue: boolean;
}

interface DbTable {
  name: string;
  columns: string[];
  rowCount: number;
}

const AVAILABLE_TOOLS = [
  { id: 'preview', name: 'Preview', icon: '🖥️', description: 'Preview your App' },
  { id: 'console', name: 'Console', icon: '⌨️', description: 'View terminal output after running your code' },
  { id: 'shell', name: 'Shell', icon: '💻', description: 'Directly access your App through a command line interface (CLI)' },
  { id: 'git', name: 'Git', icon: '⎇', description: 'Version control for your App' },
  { id: 'database', name: 'Database', icon: '🗄️', description: 'Stores structured data such as user profiles, game scores, and product catalogs' },
  { id: 'storage', name: 'App Storage', icon: '📦', description: 'Built-in object storage for images, videos, and documents' },
  { id: 'kvstore', name: 'Key-Value Store', icon: '🔑', description: 'Easy-to-use store for unstructured data, caching, and session management' },
  { id: 'auth', name: 'Auth', icon: '👤', description: 'Let users log in to your App using a prebuilt login page' },
  { id: 'files', name: 'Files', icon: '📁', description: 'Browse project files' },
  { id: 'search', name: 'Code Search', icon: '🔍', description: 'Search through the text contents of your App' },
  { id: 'secrets', name: 'Secrets', icon: '🔐', description: 'Store sensitive information like API keys securely in your App' },
  { id: 'security', name: 'Security Scanner', icon: '🛡️', description: 'Scan your app for vulnerabilities' },
  { id: 'integrations', name: 'Integrations', icon: '🔗', description: 'Connect to Replit-native and external services' },
  { id: 'assistant', name: 'Assistant', icon: '✨', description: 'Assistant answers questions, refines code, and makes precise edits' },
  { id: 'developer', name: 'Developer', icon: '⚙️', description: 'Advanced developer tools and configurations' },
  { id: 'extensions', name: 'Extension Store', icon: '🧩', description: 'Find and install workspace extensions' },
  { id: 'playground', name: 'Playground', icon: '▶️', description: 'View and test agents and automations created by Agent' },
  { id: 'publishing', name: 'Publishing', icon: '🚀', description: 'Publish a live, stable, public version of your App' },
];

export function ToolsTabs({ 
  projectId, 
  files,
  consoleLogs,
  appStatus,
  onClearConsole
}: ToolsTabsProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'preview', name: 'Preview', icon: '🖥️', closable: false },
    { id: 'console', name: 'Console', icon: '⌨️', closable: false },
    { id: 'git', name: 'Git', icon: '⎇', closable: true },
  ]);
  const [activeTab, setActiveTab] = useState('preview');
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Git state
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [gitError, setGitError] = useState('');

  // Database state
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM ');
  const [queryResult, setQueryResult] = useState<any>(null);

  // Secrets state
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [secretsLoading, setSecretsLoading] = useState(false);

  // Code search state
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; content: string }>>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowToolPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load tab preferences
  useEffect(() => {
    if (projectId) {
      fetch(`${API_BASE}/api/project/${projectId}/tabs`)
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.data) {
            const savedTabs = data.data.map((id: string) => {
              const tool = AVAILABLE_TOOLS.find(t => t.id === id);
              return tool ? { ...tool, closable: id !== 'preview' && id !== 'console' } : null;
            }).filter(Boolean);
            if (savedTabs.length > 0) {
              setTabs(savedTabs);
            }
          }
        })
        .catch(() => {});
    }
  }, [projectId]);

  // Save tab preferences when tabs change
  const saveTabs = useCallback((newTabs: Tab[]) => {
    if (projectId) {
      fetch(`${API_BASE}/api/project/${projectId}/tabs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: newTabs.map(t => t.id) })
      }).catch(() => {});
    }
  }, [projectId]);

  // Load git status
  const loadGitStatus = useCallback(async () => {
    setGitLoading(true);
    setGitError('');
    try {
      const res = await fetch(`${API_BASE}/api/git/status?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setGitStatus(data.data);
      } else {
        setGitError(data.error || 'Failed to load git status');
      }
    } catch (e: any) {
      setGitError(e?.message || 'Failed to load git status');
    }
    setGitLoading(false);
  }, [projectId]);

  // Load database tables
  const loadDbTables = useCallback(async () => {
    setDbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/database/tables?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setDbTables(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load tables:', e);
    }
    setDbLoading(false);
  }, [projectId]);

  // Load secrets
  const loadSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/secrets?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setSecrets(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load secrets:', e);
    }
    setSecretsLoading(false);
  }, [projectId]);

  // Load data when tab becomes active
  useEffect(() => {
    if (activeTab === 'git') loadGitStatus();
    if (activeTab === 'database') loadDbTables();
    if (activeTab === 'secrets') loadSecrets();
  }, [activeTab, loadGitStatus, loadDbTables, loadSecrets]);

  const addTab = (tool: typeof AVAILABLE_TOOLS[0]) => {
    if (!tabs.find(t => t.id === tool.id)) {
      const newTabs = [...tabs, { ...tool, closable: true }];
      setTabs(newTabs);
      saveTabs(newTabs);
    }
    setActiveTab(tool.id);
    setShowToolPicker(false);
    setSearchQuery('');
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    saveTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  // Git operations
  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setGitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: commitMessage })
      });
      const data = await res.json();
      if (data.ok) {
        setCommitMessage('');
        await loadGitStatus();
      } else {
        setGitError(data.error || 'Commit failed');
      }
    } catch (e: any) {
      setGitError(e?.message || 'Commit failed');
    }
    setGitLoading(false);
  };

  const handleGitPush = async () => {
    setGitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!data.ok) {
        setGitError(data.error || 'Push failed');
      }
    } catch (e: any) {
      setGitError(e?.message || 'Push failed');
    }
    setGitLoading(false);
  };

  const handleGitPull = async () => {
    setGitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/git/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (data.ok) {
        await loadGitStatus();
      } else {
        setGitError(data.error || 'Pull failed');
      }
    } catch (e: any) {
      setGitError(e?.message || 'Pull failed');
    }
    setGitLoading(false);
  };

  // Database operations
  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) return;
    setDbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, query: sqlQuery })
      });
      const data = await res.json();
      if (data.ok) {
        setQueryResult(data.data);
      } else {
        setQueryResult({ error: data.error });
      }
    } catch (e: any) {
      setQueryResult({ error: e?.message });
    }
    setDbLoading(false);
  };

  // Secrets operations
  const handleAddSecret = async () => {
    if (!newSecretKey.trim() || !newSecretValue.trim()) return;
    setSecretsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, key: newSecretKey, value: newSecretValue })
      });
      const data = await res.json();
      if (data.ok) {
        setNewSecretKey('');
        setNewSecretValue('');
        await loadSecrets();
      }
    } catch (e) {
      console.error('Failed to add secret:', e);
    }
    setSecretsLoading(false);
  };

  const handleDeleteSecret = async (key: string) => {
    setSecretsLoading(true);
    try {
      await fetch(`${API_BASE}/api/secrets/${key}?projectId=${projectId}`, {
        method: 'DELETE'
      });
      await loadSecrets();
    } catch (e) {
      console.error('Failed to delete secret:', e);
    }
    setSecretsLoading(false);
  };

  // Code search
  const handleCodeSearch = () => {
    if (!codeSearchQuery.trim()) return;
    
    const results: Array<{ file: string; line: number; content: string }> = [];
    files.forEach(file => {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(codeSearchQuery.toLowerCase())) {
          results.push({
            file: file.path,
            line: index + 1,
            content: line.trim().slice(0, 100)
          });
        }
      });
    });
    setSearchResults(results.slice(0, 50));
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
              <button className="refresh-btn" onClick={loadGitStatus} disabled={gitLoading}>
                {gitLoading ? '...' : '↻'}
              </button>
            </div>
            
            {gitError && <div className="git-error">{gitError}</div>}
            
            {gitStatus && (
              <>
                <div className="git-branch">
                  <span className="branch-icon">⎇</span>
                  <span>{gitStatus.branch}</span>
                </div>
                
                <div className="git-section">
                  <h4>Changes ({gitStatus.changedCount})</h4>
                  {gitStatus.changedFiles.length === 0 ? (
                    <p className="no-changes">No uncommitted changes</p>
                  ) : (
                    <div className="changed-files">
                      {gitStatus.changedFiles.map((f, i) => (
                        <div key={i} className={`file-change ${f.status}`}>
                          <span className="change-status">{f.statusLabel}</span>
                          <span className="change-file">{f.file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {gitStatus.changedFiles.length > 0 && (
                  <div className="commit-form">
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={e => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      className="commit-input"
                    />
                    <button className="git-btn primary" onClick={handleCommit} disabled={gitLoading || !commitMessage.trim()}>
                      Commit
                    </button>
                  </div>
                )}
                
                <div className="git-actions">
                  <button className="git-btn" onClick={handleGitPush} disabled={gitLoading}>Push</button>
                  <button className="git-btn" onClick={handleGitPull} disabled={gitLoading}>Pull</button>
                </div>
                
                <div className="git-section">
                  <h4>Recent Commits</h4>
                  {gitStatus.commits.length === 0 ? (
                    <p className="no-commits">No commits yet</p>
                  ) : (
                    <div className="commit-list">
                      {gitStatus.commits.map((commit, i) => (
                        <div key={i} className="commit-item">
                          <span className="commit-hash">{commit.hash}</span>
                          <span className="commit-message">{commit.message}</span>
                          <span className="commit-time">{commit.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="tab-content database-content">
            <div className="database-header">
              <h3>Database</h3>
              <span className="db-status connected">PostgreSQL Connected</span>
            </div>
            
            <div className="database-tables">
              <h4>Tables ({dbTables.length})</h4>
              {dbLoading ? (
                <p>Loading...</p>
              ) : dbTables.length === 0 ? (
                <p className="no-tables">No tables found</p>
              ) : (
                <div className="tables-list">
                  {dbTables.map((table, i) => (
                    <div key={i} className="table-item">
                      <span className="table-icon">📋</span>
                      <span className="table-name">{table.name}</span>
                      <span className="row-count">{table.rowCount} rows</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="query-section">
              <h4>Run Query</h4>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM ..."
                className="query-input"
              />
              <button className="db-btn" onClick={handleRunQuery} disabled={dbLoading}>
                Run Query
              </button>
              
              {queryResult && (
                <div className="query-result">
                  {queryResult.error ? (
                    <div className="query-error">{queryResult.error}</div>
                  ) : (
                    <pre>{JSON.stringify(queryResult, null, 2)}</pre>
                  )}
                </div>
              )}
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
                value={codeSearchQuery}
                onChange={e => setCodeSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCodeSearch()}
              />
              <button className="search-btn" onClick={handleCodeSearch}>Search</button>
            </div>
            <div className="search-results">
              {searchResults.length === 0 ? (
                <p className="search-hint">Enter a search term to find matches in your code</p>
              ) : (
                searchResults.map((result, i) => (
                  <div key={i} className="search-result">
                    <div className="result-file">{result.file}:{result.line}</div>
                    <div className="result-content">{result.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'secrets' && (
          <div className="tab-content secrets-content">
            <div className="secrets-header">
              <h3>Secrets</h3>
              <button className="refresh-btn" onClick={loadSecrets} disabled={secretsLoading}>
                {secretsLoading ? '...' : '↻'}
              </button>
            </div>
            <p className="secrets-desc">Store sensitive information (like API keys) securely in your App</p>
            
            <div className="secrets-list">
              {secrets.length === 0 ? (
                <p className="no-secrets">No secrets configured</p>
              ) : (
                secrets.map((secret, i) => (
                  <div key={i} className="secret-item">
                    <span className="secret-key">{secret.key}</span>
                    <span className="secret-value">{secret.masked}</span>
                    <button className="secret-delete" onClick={() => handleDeleteSecret(secret.key)}>×</button>
                  </div>
                ))
              )}
            </div>
            
            <div className="add-secret-form">
              <input
                type="text"
                value={newSecretKey}
                onChange={e => setNewSecretKey(e.target.value)}
                placeholder="KEY"
              />
              <input
                type="password"
                value={newSecretValue}
                onChange={e => setNewSecretValue(e.target.value)}
                placeholder="Value"
              />
              <button onClick={handleAddSecret} disabled={secretsLoading || !newSecretKey || !newSecretValue}>
                Add
              </button>
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

        {activeTab === 'shell' && (
          <div className="tab-content shell-content">
            <div className="shell-header">
              <h3>Shell</h3>
            </div>
            <p className="tool-desc">Directly access your App through a command line interface (CLI)</p>
            <div className="shell-terminal">
              <div className="terminal-line">$ <span className="cursor">_</span></div>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="tab-content storage-content">
            <div className="storage-header">
              <h3>App Storage</h3>
              <button className="upload-btn">Upload Files</button>
            </div>
            <p className="tool-desc">Built-in object storage that lets your app easily host and save uploads like images, videos, and documents.</p>
            <div className="storage-browser">
              <div className="storage-empty">
                <span className="empty-icon">📦</span>
                <p>No files uploaded yet</p>
                <button className="upload-btn-lg">Upload your first file</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kvstore' && (
          <div className="tab-content kvstore-content">
            <div className="kvstore-header">
              <h3>Key-Value Store</h3>
              <button className="refresh-btn">↻</button>
            </div>
            <p className="tool-desc">Free, easy-to-use key-value store suitable for unstructured data, caching, session management, fast lookups, and flexible data models</p>
            <div className="kv-list">
              <div className="kv-empty">No keys stored yet</div>
            </div>
            <div className="add-kv-form">
              <input type="text" placeholder="Key" className="kv-key-input" />
              <input type="text" placeholder="Value" className="kv-value-input" />
              <button className="add-kv-btn">Add</button>
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="tab-content auth-content">
            <div className="auth-header">
              <h3>Auth</h3>
            </div>
            <p className="tool-desc">Let users log in to your App using a prebuilt login page</p>
            <div className="auth-setup">
              <div className="auth-option">
                <span className="auth-icon">🔑</span>
                <div className="auth-info">
                  <strong>Email & Password</strong>
                  <span>Classic email and password authentication</span>
                </div>
                <button className="enable-btn">Enable</button>
              </div>
              <div className="auth-option">
                <span className="auth-icon">🔗</span>
                <div className="auth-info">
                  <strong>OAuth Providers</strong>
                  <span>Google, GitHub, and more</span>
                </div>
                <button className="enable-btn">Configure</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'developer' && (
          <div className="tab-content developer-content">
            <div className="developer-header">
              <h3>Developer Tools</h3>
            </div>
            <p className="tool-desc">Advanced developer tools and configurations</p>
            <div className="dev-options">
              <div className="dev-option">
                <span className="dev-icon">📋</span>
                <div className="dev-info">
                  <strong>Environment Variables</strong>
                  <span>Configure environment-specific settings</span>
                </div>
              </div>
              <div className="dev-option">
                <span className="dev-icon">🔧</span>
                <div className="dev-info">
                  <strong>Run Configuration</strong>
                  <span>Customize how your app runs</span>
                </div>
              </div>
              <div className="dev-option">
                <span className="dev-icon">📦</span>
                <div className="dev-info">
                  <strong>Package Manager</strong>
                  <span>Manage dependencies</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'extensions' && (
          <div className="tab-content extensions-content">
            <div className="extensions-header">
              <h3>Extension Store</h3>
              <input type="text" placeholder="Search extensions..." className="ext-search" />
            </div>
            <p className="tool-desc">Find and install workspace extensions</p>
            <div className="extensions-list">
              <div className="extension-item">
                <span className="ext-icon">🎨</span>
                <div className="ext-info">
                  <strong>Theme Pack</strong>
                  <span>Additional color themes for your workspace</span>
                </div>
                <button className="install-btn">Install</button>
              </div>
              <div className="extension-item">
                <span className="ext-icon">📝</span>
                <div className="ext-info">
                  <strong>Markdown Preview</strong>
                  <span>Live preview for Markdown files</span>
                </div>
                <button className="install-btn">Install</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'publishing' && (
          <div className="tab-content publishing-content">
            <div className="publishing-header">
              <h3>Publishing</h3>
            </div>
            <p className="tool-desc">Publish a live, stable, public version of your App, unaffected by changes you make in the workspace.</p>
            <div className="publishing-options">
              <div className="publish-status">
                <span className="status-icon">⚪</span>
                <span>Not published</span>
              </div>
              <button className="publish-btn">Publish App</button>
              <div className="publish-info">
                <p>When you publish, your app will be available at a public URL.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
