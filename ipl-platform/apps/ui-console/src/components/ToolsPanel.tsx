import { useState } from 'react';
import './ToolsPanel.css';

interface ToolsPanelProps {
  projectId: string;
  onToolSelect: (tool: string) => void;
  activeTool: string;
  files: Array<{ path: string; content: string; type: string }>;
  consoleLogs: string[];
  appStatus: { status: string; port: number | null; logs: string[] };
}

const TOOLS = [
  { id: 'preview', name: 'Preview', icon: '🖥️', description: 'Preview your App' },
  { id: 'console', name: 'Console', icon: '⌨️', description: 'View terminal output' },
  { id: 'files', name: 'Files', icon: '📁', description: 'Browse project files' },
  { id: 'database', name: 'Database', icon: '🗄️', description: 'View and edit data' },
  { id: 'git', name: 'Git', icon: '⎇', description: 'Version control' },
  { id: 'search', name: 'Code Search', icon: '🔍', description: 'Search through code' },
  { id: 'secrets', name: 'Secrets', icon: '🔐', description: 'Manage API keys' },
  { id: 'settings', name: 'Settings', icon: '⚙️', description: 'Project settings' },
];

export function ToolsPanel({ 
  projectId, 
  onToolSelect, 
  activeTool,
  files,
  consoleLogs,
  appStatus
}: ToolsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; content: string }>>([]);
  const [gitLog, setGitLog] = useState<string[]>([]);
  const [secrets, setSecrets] = useState<Array<{ key: string; masked: string }>>([
    { key: 'DATABASE_URL', masked: '****' },
    { key: 'API_KEY', masked: '****' },
  ]);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const results: Array<{ file: string; line: number; content: string }> = [];
    files.forEach(file => {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  const addSecret = () => {
    if (newSecretKey && newSecretValue) {
      setSecrets([...secrets, { key: newSecretKey, masked: '****' }]);
      setNewSecretKey('');
      setNewSecretValue('');
    }
  };

  return (
    <div className="tools-panel">
      <div className="tools-sidebar">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolSelect(tool.id)}
            title={tool.description}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-name">{tool.name}</span>
          </button>
        ))}
      </div>

      <div className="tools-content">
        {activeTool === 'preview' && (
          <div className="tool-section preview-section">
            <div className="tool-header">
              <h3>🖥️ Preview</h3>
              <span className={`status-indicator ${appStatus.status}`}>
                {appStatus.status}
              </span>
            </div>
            <div className="preview-container">
              {appStatus.status === 'running' && appStatus.port ? (
                <iframe 
                  src={`http://localhost:${appStatus.port}`}
                  className="preview-iframe"
                  title="App Preview"
                />
              ) : (
                <div className="preview-placeholder">
                  <p>App is not running</p>
                  <p className="hint">Start your app to see the preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'console' && (
          <div className="tool-section console-section">
            <div className="tool-header">
              <h3>⌨️ Console</h3>
              <button className="clear-btn" onClick={() => {}}>Clear</button>
            </div>
            <div className="console-output">
              {consoleLogs.length === 0 ? (
                <div className="empty-console">No output yet...</div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`console-line ${
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

        {activeTool === 'files' && (
          <div className="tool-section files-section">
            <div className="tool-header">
              <h3>📁 Files</h3>
              <span className="file-count">{files.length} files</span>
            </div>
            <div className="files-tree">
              {files.length === 0 ? (
                <div className="empty-files">No files generated yet</div>
              ) : (
                files.map((file, i) => (
                  <div key={i} className="file-item">
                    <span className="file-icon">
                      {file.type === 'directory' ? '📁' : 
                       file.path.endsWith('.ts') ? '📘' :
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

        {activeTool === 'database' && (
          <div className="tool-section database-section">
            <div className="tool-header">
              <h3>🗄️ Database</h3>
            </div>
            <div className="database-content">
              <p className="db-info">PostgreSQL connected</p>
              <div className="db-actions">
                <button className="db-action-btn">View Tables</button>
                <button className="db-action-btn">Run Query</button>
                <button className="db-action-btn">Import Data</button>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'git' && (
          <div className="tool-section git-section">
            <div className="tool-header">
              <h3>⎇ Git</h3>
            </div>
            <div className="git-content">
              <div className="git-status">
                <h4>Changes</h4>
                <p className="no-changes">No uncommitted changes</p>
              </div>
              <div className="git-actions">
                <button className="git-btn">Commit</button>
                <button className="git-btn">Push</button>
                <button className="git-btn">Pull</button>
              </div>
              <div className="git-log">
                <h4>Recent Commits</h4>
                {gitLog.length === 0 ? (
                  <p className="no-commits">No commits yet</p>
                ) : (
                  gitLog.map((commit, i) => (
                    <div key={i} className="commit-item">{commit}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTool === 'search' && (
          <div className="tool-section search-section">
            <div className="tool-header">
              <h3>🔍 Code Search</h3>
            </div>
            <div className="search-content">
              <div className="search-input-group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in files..."
                  className="search-input"
                />
                <button onClick={handleSearch} className="search-btn">Search</button>
              </div>
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <p className="no-results">Enter a search term</p>
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
          </div>
        )}

        {activeTool === 'secrets' && (
          <div className="tool-section secrets-section">
            <div className="tool-header">
              <h3>🔐 Secrets</h3>
            </div>
            <div className="secrets-content">
              <div className="secrets-list">
                {secrets.map((secret, i) => (
                  <div key={i} className="secret-item">
                    <span className="secret-key">{secret.key}</span>
                    <span className="secret-value">{secret.masked}</span>
                    <button className="secret-delete">×</button>
                  </div>
                ))}
              </div>
              <div className="add-secret">
                <input
                  type="text"
                  value={newSecretKey}
                  onChange={e => setNewSecretKey(e.target.value)}
                  placeholder="KEY"
                  className="secret-input"
                />
                <input
                  type="password"
                  value={newSecretValue}
                  onChange={e => setNewSecretValue(e.target.value)}
                  placeholder="Value"
                  className="secret-input"
                />
                <button onClick={addSecret} className="add-secret-btn">Add</button>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'settings' && (
          <div className="tool-section settings-section">
            <div className="tool-header">
              <h3>⚙️ Settings</h3>
            </div>
            <div className="settings-content">
              <div className="setting-group">
                <label>Project Name</label>
                <input type="text" className="setting-input" placeholder="My Project" />
              </div>
              <div className="setting-group">
                <label>Node Version</label>
                <select className="setting-select">
                  <option>Node 20 (LTS)</option>
                  <option>Node 18</option>
                  <option>Node 16</option>
                </select>
              </div>
              <div className="setting-group">
                <label>Package Manager</label>
                <select className="setting-select">
                  <option>npm</option>
                  <option>yarn</option>
                  <option>pnpm</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
