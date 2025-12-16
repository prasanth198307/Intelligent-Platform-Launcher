import { useState, useRef, useEffect, useCallback } from 'react';
import './ToolsTabs.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';

interface Module {
  name: string;
  description?: string;
  tables?: string[];
  apis?: string[];
  status: string;
}

interface ToolsTabsProps {
  projectId: string;
  files: Array<{ path: string; content: string; type: string }>;
  consoleLogs: string[];
  appStatus: { status: string; port: number | null; logs: string[] };
  onClearConsole: () => void;
  modules?: Module[];
}

interface Tab {
  id: string;
  name: string;
  icon: string;
  closable: boolean;
}

interface GitStatus {
  initialized: boolean;
  branch: string;
  changedFiles: Array<{ status: string; file: string; statusLabel: string }>;
  changedCount: number;
  commits: Array<{ hash: string; message: string; time: string; author: string }>;
  remotes?: Array<{ name: string; url: string }>;
  isProjectDir?: boolean;
  hint?: string;
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
  { id: 'modules', name: 'Modules', icon: '📦', description: 'View modules created by the AI agent' },
  { id: 'shell', name: 'Shell', icon: '💻', description: 'Directly access your App through a command line interface (CLI)' },
  { id: 'git', name: 'Git', icon: '⎇', description: 'Version control for your App' },
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Connect to GitHub repositories, manage branches, commits, and pull requests' },
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
  onClearConsole,
  modules = []
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
  const [dbActiveTab, setDbActiveTab] = useState<'data' | 'settings'>('data');
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Secrets state
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [secretsLoading, setSecretsLoading] = useState(false);

  // Code search state
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; content: string }>>([]);

  // GitHub state
  const [githubRepos, setGithubRepos] = useState<Array<{ name: string; full_name: string; description: string | null; private: boolean; html_url: string; updated_at: string }>>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubError, setGithubError] = useState('');

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

  // Load database tables - project-specific only
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

  // Load GitHub repos
  const loadGithubRepos = useCallback(async () => {
    setGithubLoading(true);
    setGithubError('');
    try {
      const res = await fetch(`${API_BASE}/api/github/repos?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setGithubConnected(true);
        setGithubRepos(data.data || []);
      } else {
        setGithubConnected(false);
        setGithubError(data.error || 'GitHub not connected');
      }
    } catch (e: any) {
      setGithubConnected(false);
      setGithubError(e?.message || 'Failed to load GitHub repos');
    }
    setGithubLoading(false);
  }, [projectId]);

  // Load data when tab becomes active
  useEffect(() => {
    if (activeTab === 'git') loadGitStatus();
    if (activeTab === 'database') loadDbTables();
    if (activeTab === 'secrets') loadSecrets();
    if (activeTab === 'github') loadGithubRepos();
  }, [activeTab, loadGitStatus, loadDbTables, loadSecrets, loadGithubRepos]);

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

        {activeTab === 'modules' && (
          <div className="tab-content modules-content">
            <div className="modules-header">
              <h3>Built Modules</h3>
              <span className="module-count">{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
            </div>
            {modules.length === 0 ? (
              <div className="modules-empty">
                <div className="empty-icon">📦</div>
                <p>No modules built yet</p>
                <p className="empty-hint">Ask the AI to create modules like "Build user management" or "Create products module"</p>
              </div>
            ) : (
              <div className="modules-list">
                {modules.map((mod, i) => (
                  <div key={i} className={`module-card module-${mod.status}`}>
                    <div className="module-header">
                      <span className="module-icon">📦</span>
                      <span className="module-name">{mod.name}</span>
                      <span className={`module-status status-${mod.status}`}>{mod.status}</span>
                    </div>
                    {mod.description && (
                      <p className="module-description">{mod.description}</p>
                    )}
                    <div className="module-details">
                      {mod.tables && mod.tables.length > 0 && (
                        <div className="module-tables">
                          <span className="detail-label">Tables:</span>
                          {mod.tables.map((t, ti) => (
                            <span key={ti} className="table-tag">{t}</span>
                          ))}
                        </div>
                      )}
                      {mod.apis && mod.apis.length > 0 && (
                        <div className="module-apis">
                          <span className="detail-label">APIs:</span>
                          {mod.apis.map((a, ai) => (
                            <span key={ai} className="api-tag">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'git' && (
          <div className="tab-content git-content">
            <div className="git-header">
              <div className="git-branch-selector">
                <span className="branch-icon">⎇</span>
                <span className="branch-name">{gitStatus?.branch || 'main'}</span>
                <span className="branch-dropdown">▾</span>
              </div>
              <div className="git-header-actions">
                <button className="refresh-btn" onClick={loadGitStatus} disabled={gitLoading}>
                  {gitLoading ? '...' : '↻'}
                </button>
              </div>
            </div>
            
            {gitError && <div className="git-error">{gitError}</div>}
            
            {gitLoading && !gitStatus && (
              <p className="loading-text">Loading git status...</p>
            )}
            
            {gitStatus && !gitStatus.initialized && (
              <div className="git-not-initialized">
                <p className="git-hint">{gitStatus.hint || 'Git repository not initialized'}</p>
              </div>
            )}
            
            {gitStatus && gitStatus.initialized && (
              <>
                {/* Remote Updates Section */}
                <div className="git-remote-section">
                  <div className="remote-header">
                    <span className="remote-title">Remote Updates</span>
                    {gitStatus.remotes && gitStatus.remotes.find(r => r.name === 'origin') && (
                      <a 
                        href={gitStatus.remotes.find(r => r.name === 'origin')?.url.replace('.git', '')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="remote-link"
                      >
                        🔗 {gitStatus.remotes.find(r => r.name === 'origin')?.url.split('/').pop()?.replace('.git', '')}
                      </a>
                    )}
                  </div>
                  
                  {gitStatus.remotes && gitStatus.remotes.length > 0 ? (
                    <>
                      <div className="remote-info">
                        <span className="remote-branch">origin/{gitStatus.branch}</span>
                        <span className="remote-upstream">• upstream</span>
                        <button 
                          className="change-repo-btn"
                          onClick={() => {
                            const repoUrl = prompt('Enter new GitHub repository URL:', gitStatus.remotes?.find(r => r.name === 'origin')?.url || '');
                            if (repoUrl) {
                              fetch(`${API_BASE}/api/git/add-remote`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ projectId, remoteUrl: repoUrl, remoteName: 'origin' })
                              }).then(() => loadGitStatus()).catch(console.error);
                            }
                          }}
                        >
                          Change
                        </button>
                      </div>
                      <div className="sync-actions">
                        <button className="sync-btn" onClick={handleGitPull} disabled={gitLoading}>
                          ↓↑ Sync with Remote
                        </button>
                        <button className="git-btn" onClick={handleGitPull} disabled={gitLoading}>↓ Pull</button>
                        <button className="git-btn" onClick={handleGitPush} disabled={gitLoading}>↑ Push</button>
                      </div>
                    </>
                  ) : (
                    <div className="connect-repo-section">
                      <p className="no-remote-text">No remote repository connected</p>
                      <button className="connect-repo-btn" onClick={() => {
                        const repoUrl = prompt('Enter GitHub repository URL (e.g., https://github.com/user/repo.git):');
                        if (repoUrl) {
                          fetch(`${API_BASE}/api/git/add-remote`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ projectId, remoteUrl: repoUrl, remoteName: 'origin' })
                          }).then(() => loadGitStatus()).catch(console.error);
                        }
                      }}>
                        + Connect to GitHub
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Commit Section */}
                <div className="git-section">
                  <h4>Commit</h4>
                  {gitStatus.changedFiles.length === 0 ? (
                    <p className="no-changes">There are no changes to commit.</p>
                  ) : (
                    <>
                      <div className="commit-form">
                        <input
                          type="text"
                          value={commitMessage}
                          onChange={e => setCommitMessage(e.target.value)}
                          placeholder="Enter commit message..."
                          className="commit-input"
                        />
                        <button className="git-btn primary" onClick={handleCommit} disabled={gitLoading || !commitMessage.trim()}>
                          Commit
                        </button>
                      </div>
                      <div className="changed-files">
                        {gitStatus.changedFiles.slice(0, 15).map((f, i) => (
                          <div key={i} className={`file-change ${f.status}`}>
                            <span className="change-status">{f.statusLabel}</span>
                            <span className="change-file">{f.file}</span>
                          </div>
                        ))}
                        {gitStatus.changedFiles.length > 15 && (
                          <p className="more-files">... and {gitStatus.changedFiles.length - 15} more files</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Commit History Section */}
                <div className="git-section">
                  <div className="commits-header">
                    <span className="not-pushed-indicator">↓ Not pushed to remote</span>
                  </div>
                  {gitStatus.commits.length === 0 ? (
                    <p className="no-commits">No commits yet</p>
                  ) : (
                    <div className="commit-list">
                      {gitStatus.commits.map((commit, i) => (
                        <div key={i} className="commit-item">
                          <div className="commit-bullet">•</div>
                          <div className="commit-details">
                            <span className="commit-message-text">{commit.message}</span>
                            <span className="commit-meta">
                              <span className="commit-author">👤 {commit.author}</span>
                              <span className="commit-time">{commit.time}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'github' && (
          <div className="tab-content github-content">
            <div className="github-header">
              <h3>🐙 GitHub</h3>
              <button className="refresh-btn" onClick={loadGithubRepos} disabled={githubLoading}>
                {githubLoading ? '...' : '↻'}
              </button>
            </div>
            
            {githubError && !githubConnected && (
              <div className="github-not-connected">
                <p className="github-status">GitHub is not connected</p>
                <p className="github-info">Connect your GitHub account to:</p>
                <ul className="github-benefits">
                  <li>Push code to repositories</li>
                  <li>Create and manage branches</li>
                  <li>Open pull requests</li>
                  <li>Import from existing repos</li>
                </ul>
                <p className="github-hint">Ask the AI agent to connect GitHub or use the Integrations tab.</p>
              </div>
            )}
            
            {githubConnected && (
              <>
                <div className="github-connected-badge">
                  <span className="check-icon">✓</span>
                  <span>Connected to GitHub</span>
                </div>
                
                <div className="github-repos">
                  <h4>Your Repositories ({githubRepos.length})</h4>
                  {githubLoading ? (
                    <p>Loading repositories...</p>
                  ) : githubRepos.length === 0 ? (
                    <p className="no-repos">No repositories found</p>
                  ) : (
                    <div className="repos-list">
                      {githubRepos.map((repo, i) => (
                        <div key={i} className="repo-item">
                          <div className="repo-header">
                            <span className="repo-icon">{repo.private ? '🔒' : '📂'}</span>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="repo-name">
                              {repo.full_name}
                            </a>
                          </div>
                          {repo.description && (
                            <p className="repo-description">{repo.description}</p>
                          )}
                          <span className="repo-updated">Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
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
              <div className="db-tabs">
                <button 
                  className={`db-tab ${dbActiveTab === 'data' ? 'active' : ''}`}
                  onClick={() => setDbActiveTab('data')}
                >
                  My Data
                </button>
                <button 
                  className={`db-tab ${dbActiveTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setDbActiveTab('settings')}
                >
                  Settings
                </button>
              </div>
              <div className="db-controls">
                <button className="refresh-btn" onClick={loadDbTables} disabled={dbLoading}>
                  {dbLoading ? '...' : '↻'}
                </button>
                <span className="db-status connected">
                  <span className="status-dot"></span>
                  PostgreSQL Connected
                </span>
              </div>
            </div>
            
            {dbActiveTab === 'data' && (
              <>
                <div className="database-tables">
                  <h4>TABLES ({dbTables.length})</h4>
                  {dbLoading ? (
                    <p className="loading-text">Loading tables...</p>
                  ) : dbTables.length === 0 ? (
                    <p className="no-tables">No tables found. Click refresh to load tables.</p>
                  ) : (
                    <div className="tables-list">
                      {dbTables.map((table, i) => (
                        <div 
                          key={i} 
                          className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedTable(table.name);
                            setSqlQuery(`SELECT * FROM "${table.name}" LIMIT 100`);
                          }}
                        >
                          <span className="table-icon">🗃️</span>
                          <span className="table-name">{table.name}</span>
                          <span className="row-count">{table.rowCount} rows</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="query-section">
                  <h4>RUN QUERY</h4>
                  <textarea
                    value={sqlQuery}
                    onChange={e => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM ..."
                    className="query-input"
                    rows={4}
                  />
                  <button className="db-btn primary" onClick={handleRunQuery} disabled={dbLoading}>
                    Run Query
                  </button>
                  
                  {queryResult && (
                    <div className="query-result">
                      {queryResult.error ? (
                        <div className="query-error">{queryResult.error}</div>
                      ) : Array.isArray(queryResult) ? (
                        <div className="result-table-container">
                          <table className="result-table">
                            <thead>
                              <tr>
                                {queryResult.length > 0 && Object.keys(queryResult[0]).map((col, i) => (
                                  <th key={i}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.slice(0, 50).map((row: any, i: number) => (
                                <tr key={i}>
                                  {Object.values(row).map((val: any, j: number) => (
                                    <td key={j}>{val === null ? 'NULL' : String(val)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {queryResult.length > 50 && (
                            <p className="result-truncated">Showing 50 of {queryResult.length} rows</p>
                          )}
                        </div>
                      ) : (
                        <pre className="result-json">{JSON.stringify(queryResult, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {dbActiveTab === 'settings' && (
              <div className="db-settings">
                <div className="settings-section">
                  <h4>Connection Details</h4>
                  <div className="connection-info">
                    <div className="connection-row">
                      <span className="connection-label">DATABASE_URL</span>
                      <code className="connection-value">postgresql://***@neon.tech/neondb</code>
                      <button className="copy-btn" onClick={() => navigator.clipboard.writeText('DATABASE_URL')}>
                        Copy
                      </button>
                    </div>
                    <div className="connection-row">
                      <span className="connection-label">PGHOST</span>
                      <code className="connection-value">neon.tech</code>
                    </div>
                    <div className="connection-row">
                      <span className="connection-label">PGDATABASE</span>
                      <code className="connection-value">neondb</code>
                    </div>
                    <div className="connection-row">
                      <span className="connection-label">PGPORT</span>
                      <code className="connection-value">5432</code>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h4>Database Provider</h4>
                  <div className="provider-info">
                    <span className="provider-logo">🐘</span>
                    <div className="provider-details">
                      <span className="provider-name">Neon PostgreSQL</span>
                      <span className="provider-desc">Serverless Postgres with autoscaling</span>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h4>Usage</h4>
                  <div className="usage-stats">
                    <div className="usage-item">
                      <span className="usage-label">Tables</span>
                      <span className="usage-value">{dbTables.length}</span>
                    </div>
                    <div className="usage-item">
                      <span className="usage-label">Storage</span>
                      <span className="usage-value">~0.1 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
