import { useState } from 'react';

interface DevToolsPanelProps {
  domain: string;
  tables?: any[];
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

interface EndpointInfo {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean }[];
}

export default function DevToolsPanel({ domain, tables }: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'git' | 'querybuilder' | 'endpoints'>('git');
  
  const [commits, setCommits] = useState<any[]>([]);
  const [branches, setBranches] = useState<string[]>(['main', 'develop', 'feature/auth', 'feature/api']);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  
  const [selectedTable, setSelectedTable] = useState('');
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [whereClause, setWhereClause] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [limit, setLimit] = useState('100');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<EndpointInfo[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const mockCommits = [
    { hash: 'a1b2c3d', message: 'Add user authentication endpoints', author: 'dev@example.com', date: '2 hours ago', branch: 'main' },
    { hash: 'e4f5g6h', message: 'Implement database models', author: 'dev@example.com', date: '5 hours ago', branch: 'main' },
    { hash: 'i7j8k9l', message: 'Setup project structure', author: 'dev@example.com', date: '1 day ago', branch: 'main' },
    { hash: 'm0n1o2p', message: 'Initial commit', author: 'dev@example.com', date: '2 days ago', branch: 'main' },
  ];

  const createCommit = () => {
    if (!commitMessage.trim()) return;
    const newCommit = {
      hash: Math.random().toString(36).substring(2, 9),
      message: commitMessage,
      author: 'you@example.com',
      date: 'Just now',
      branch: currentBranch
    };
    setCommits([newCommit, ...commits]);
    setCommitMessage('');
  };

  const buildQuery = () => {
    if (!selectedTable) return;
    
    const cols = queryColumns.length > 0 ? queryColumns.join(', ') : '*';
    let sql = `SELECT ${cols}\nFROM ${selectedTable}`;
    
    if (whereClause.trim()) {
      sql += `\nWHERE ${whereClause}`;
    }
    
    if (orderBy.trim()) {
      sql += `\nORDER BY ${orderBy}`;
    }
    
    if (limit.trim()) {
      sql += `\nLIMIT ${limit}`;
    }
    
    sql += ';';
    setGeneratedSQL(sql);
  };

  const executeQuery = async () => {
    if (!generatedSQL) return;
    setExecuting(true);
    
    await new Promise(r => setTimeout(r, 500));
    
    const table = tables?.find(t => t.name === selectedTable);
    const cols = queryColumns.length > 0 ? queryColumns : (table?.columns.map((c: any) => c.name) || ['id', 'name', 'created_at']);
    
    const mockRows = Array.from({ length: Math.min(parseInt(limit) || 10, 10) }, (_, i) => 
      cols.map(col => {
        if (col === 'id') return i + 1;
        if (col.includes('name')) return `Sample ${i + 1}`;
        if (col.includes('email')) return `user${i + 1}@example.com`;
        if (col.includes('date') || col.includes('created') || col.includes('updated')) return new Date().toISOString();
        if (col.includes('status')) return ['active', 'pending', 'completed'][i % 3];
        if (col.includes('amount') || col.includes('price')) return (Math.random() * 1000).toFixed(2);
        return `value_${i + 1}`;
      })
    );
    
    setQueryResult({
      columns: cols,
      rows: mockRows,
      rowCount: mockRows.length,
      executionTime: Math.round(Math.random() * 50 + 5)
    });
    
    setExecuting(false);
  };

  const discoverEndpoints = async () => {
    setDiscovering(true);
    await new Promise(r => setTimeout(r, 1000));
    
    const endpoints: EndpointInfo[] = [];
    
    endpoints.push(
      { method: 'POST', path: '/api/auth/register', description: 'Register new user', params: [
        { name: 'email', type: 'string', required: true },
        { name: 'password', type: 'string', required: true },
        { name: 'name', type: 'string', required: false }
      ]},
      { method: 'POST', path: '/api/auth/login', description: 'Authenticate user', params: [
        { name: 'email', type: 'string', required: true },
        { name: 'password', type: 'string', required: true }
      ]},
      { method: 'POST', path: '/api/auth/logout', description: 'End user session' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user profile' }
    );
    
    (tables || []).forEach(table => {
      const name = table.name;
      endpoints.push(
        { method: 'GET', path: `/api/${name}`, description: `List all ${name}`, params: [
          { name: 'limit', type: 'number', required: false },
          { name: 'offset', type: 'number', required: false }
        ]},
        { method: 'GET', path: `/api/${name}/:id`, description: `Get ${name} by ID`, params: [
          { name: 'id', type: 'string', required: true }
        ]},
        { method: 'POST', path: `/api/${name}`, description: `Create new ${name}` },
        { method: 'PUT', path: `/api/${name}/:id`, description: `Update ${name}` },
        { method: 'DELETE', path: `/api/${name}/:id`, description: `Delete ${name}` }
      );
    });
    
    setDiscoveredEndpoints(endpoints);
    setDiscovering(false);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#10b981';
      case 'POST': return '#3b82f6';
      case 'PUT': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      case 'PATCH': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'git', label: 'Git Integration', icon: '📦' },
          { id: 'querybuilder', label: 'Query Builder', icon: '🔍' },
          { id: 'endpoints', label: 'API Discovery', icon: '🔌' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? '#334155' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === tab.id ? '#e2e8f0' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {activeTab === 'git' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Manage your Git repository, branches, and commits.
            </p>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>
                  Current Branch
                </label>
                <select
                  value={currentBranch}
                  onChange={(e) => setCurrentBranch(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                >
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>
                  Actions
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}>
                    ↓ Pull
                  </button>
                  <button style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}>
                    ↑ Push
                  </button>
                </div>
              </div>
            </div>

            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              padding: 12, 
              marginBottom: 16,
              border: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={createCommit}
                  disabled={!commitMessage.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Commit
                </button>
              </div>
            </div>

            <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Recent Commits</h4>
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {[...commits, ...mockCommits].map((commit, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: 10,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <code style={{ color: '#f59e0b', fontSize: 11 }}>{commit.hash}</code>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e2e8f0', fontSize: 13 }}>{commit.message}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                      {commit.author} • {commit.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'querybuilder' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Build SQL queries visually without writing code.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Table</label>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setQueryColumns([]);
                  }}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                >
                  <option value="">Select a table...</option>
                  {(tables || []).map((table: any) => (
                    <option key={table.name} value={table.name}>{table.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Limit</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            {selectedTable && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Columns</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tables?.find(t => t.name === selectedTable)?.columns.map((col: any) => (
                    <button
                      key={col.name}
                      onClick={() => {
                        const cols = queryColumns.includes(col.name)
                          ? queryColumns.filter(c => c !== col.name)
                          : [...queryColumns, col.name];
                        setQueryColumns(cols);
                      }}
                      style={{
                        background: queryColumns.includes(col.name) ? '#3b82f6' : '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 4,
                        padding: '4px 10px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>WHERE (optional)</label>
              <input
                type="text"
                value={whereClause}
                onChange={(e) => setWhereClause(e.target.value)}
                placeholder="e.g., status = 'active' AND created_at > '2024-01-01'"
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>ORDER BY (optional)</label>
              <input
                type="text"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                placeholder="e.g., created_at DESC"
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={buildQuery}
                disabled={!selectedTable}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Build Query
              </button>
              <button
                onClick={executeQuery}
                disabled={!generatedSQL || executing}
                style={{
                  background: executing ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {executing ? '⏳ Executing...' : '▶ Execute'}
              </button>
            </div>

            {generatedSQL && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Generated SQL</label>
                <pre style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 12,
                  color: '#10b981',
                  fontSize: 12,
                  overflow: 'auto',
                }}>
                  {generatedSQL}
                </pre>
              </div>
            )}

            {queryResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Results</span>
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    {queryResult.rowCount} rows • {queryResult.executionTime}ms
                  </span>
                </div>
                <div style={{ 
                  background: '#0f172a', 
                  border: '1px solid #334155', 
                  borderRadius: 6, 
                  overflow: 'auto',
                  maxHeight: 300
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            borderBottom: '1px solid #334155',
                            color: '#94a3b8',
                            background: '#1e293b'
                          }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} style={{ 
                              padding: '8px 12px', 
                              borderBottom: '1px solid #334155',
                              color: '#e2e8f0'
                            }}>
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Automatically discover API endpoints from your codebase and database schema.
            </p>
            
            <button
              onClick={discoverEndpoints}
              disabled={discovering}
              style={{
                background: discovering ? '#475569' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {discovering ? '🔍 Discovering...' : '🔌 Discover Endpoints'}
            </button>

            {discoveredEndpoints.length > 0 && (
              <div>
                <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>
                  Discovered Endpoints ({discoveredEndpoints.length})
                </h4>
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {discoveredEndpoints.map((endpoint, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          background: getMethodColor(endpoint.method),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}>
                          {endpoint.method}
                        </span>
                        <code style={{ color: '#e2e8f0', fontSize: 13 }}>{endpoint.path}</code>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: endpoint.params?.length ? 8 : 0 }}>
                        {endpoint.description}
                      </p>
                      {endpoint.params && endpoint.params.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {endpoint.params.map((param, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                background: '#1e293b',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                color: param.required ? '#f59e0b' : '#64748b',
                              }}
                            >
                              {param.name}: {param.type}{param.required ? ' *' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
