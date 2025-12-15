import { useState } from 'react';

interface DataConnectivityPanelProps {
  domain: string;
  selectedDb: string;
}

interface ConnectionConfig {
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

interface DiscoveredTable {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
  rowCount: number;
}

interface Pipeline {
  id: string;
  name: string;
  source: string;
  destination: string;
  schedule: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
}

export default function DataConnectivityPanel({ domain, selectedDb }: DataConnectivityPanelProps) {
  const [activeTab, setActiveTab] = useState<'connect' | 'schema' | 'pipelines' | 'import'>('connect');
  
  const [connection, setConnection] = useState<ConnectionConfig>({
    type: selectedDb || 'postgresql',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    ssl: true
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [connectionError, setConnectionError] = useState('');
  
  const [discoveredTables, setDiscoveredTables] = useState<DiscoveredTable[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [newPipeline, setNewPipeline] = useState({ name: '', source: '', destination: '', schedule: 'daily' });
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'csv' | 'json' | 'sql'>('csv');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; rows: number; errors: string[] } | null>(null);

  const dbPorts: Record<string, string> = {
    postgresql: '5432',
    mysql: '3306',
    mongodb: '27017',
    sqlserver: '1433',
    oracle: '1521',
    redis: '6379'
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    
    await new Promise(r => setTimeout(r, 1500));
    
    if (!connection.host || !connection.database || !connection.username) {
      setConnectionStatus('failed');
      setConnectionError('Please fill in all required fields');
      return;
    }
    
    if (Math.random() > 0.2) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('failed');
      setConnectionError('Connection refused: Unable to reach host. Check your credentials and network settings.');
    }
  };

  const discoverSchema = async () => {
    setDiscovering(true);
    await new Promise(r => setTimeout(r, 1200));
    
    const mockTables: DiscoveredTable[] = [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'serial', nullable: false },
          { name: 'email', type: 'varchar(255)', nullable: false },
          { name: 'name', type: 'varchar(100)', nullable: true },
          { name: 'password_hash', type: 'varchar(255)', nullable: false },
          { name: 'created_at', type: 'timestamp', nullable: false },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ],
        rowCount: 15420
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'serial', nullable: false },
          { name: 'user_id', type: 'integer', nullable: false },
          { name: 'total_amount', type: 'decimal(10,2)', nullable: false },
          { name: 'status', type: 'varchar(50)', nullable: false },
          { name: 'created_at', type: 'timestamp', nullable: false }
        ],
        rowCount: 89234
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'serial', nullable: false },
          { name: 'name', type: 'varchar(200)', nullable: false },
          { name: 'price', type: 'decimal(10,2)', nullable: false },
          { name: 'inventory', type: 'integer', nullable: false },
          { name: 'category_id', type: 'integer', nullable: true }
        ],
        rowCount: 5678
      },
      {
        name: 'categories',
        columns: [
          { name: 'id', type: 'serial', nullable: false },
          { name: 'name', type: 'varchar(100)', nullable: false },
          { name: 'parent_id', type: 'integer', nullable: true }
        ],
        rowCount: 45
      }
    ];
    
    setDiscoveredTables(mockTables);
    setDiscovering(false);
  };

  const addPipeline = () => {
    if (!newPipeline.name || !newPipeline.source || !newPipeline.destination) return;
    
    setPipelines([...pipelines, {
      id: Math.random().toString(36).substring(7),
      ...newPipeline,
      status: 'active',
      lastRun: new Date().toISOString()
    }]);
    setNewPipeline({ name: '', source: '', destination: '', schedule: 'daily' });
  };

  const togglePipeline = (id: string) => {
    setPipelines(pipelines.map(p => 
      p.id === id ? { ...p, status: p.status === 'active' ? 'paused' : 'active' } : p
    ));
  };

  const runImport = async () => {
    if (!importFile) return;
    setImporting(true);
    
    await new Promise(r => setTimeout(r, 2000));
    
    setImportResult({
      success: true,
      rows: Math.floor(Math.random() * 10000) + 1000,
      errors: Math.random() > 0.7 ? ['Row 245: Invalid date format', 'Row 1023: Missing required field'] : []
    });
    setImporting(false);
  };

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'connect', label: 'Connect', icon: '🔌' },
          { id: 'schema', label: 'Schema Discovery', icon: '🔍' },
          { id: 'pipelines', label: 'Data Pipelines', icon: '🔄' },
          { id: 'import', label: 'Import Data', icon: '📥' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? '#334155' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
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
        {activeTab === 'connect' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Connect to your existing database to import schemas and sync data.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Database Type</label>
                <select
                  value={connection.type}
                  onChange={(e) => setConnection({ 
                    ...connection, 
                    type: e.target.value,
                    port: dbPorts[e.target.value] || '5432'
                  })}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="oracle">Oracle</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Host</label>
                <input
                  type="text"
                  value={connection.host}
                  onChange={(e) => setConnection({ ...connection, host: e.target.value })}
                  placeholder="localhost or db.example.com"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Port</label>
                <input
                  type="text"
                  value={connection.port}
                  onChange={(e) => setConnection({ ...connection, port: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Database Name</label>
                <input
                  type="text"
                  value={connection.database}
                  onChange={(e) => setConnection({ ...connection, database: e.target.value })}
                  placeholder="my_database"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Username</label>
                <input
                  type="text"
                  value={connection.username}
                  onChange={(e) => setConnection({ ...connection, username: e.target.value })}
                  placeholder="db_user"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Password</label>
                <input
                  type="password"
                  value={connection.password}
                  onChange={(e) => setConnection({ ...connection, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={connection.ssl}
                onChange={(e) => setConnection({ ...connection, ssl: e.target.checked })}
              />
              Use SSL/TLS connection
            </label>

            <button
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
              style={{
                background: connectionStatus === 'testing' ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                color: 'white',
                cursor: connectionStatus === 'testing' ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {connectionStatus === 'testing' ? '🔄 Testing...' : '🔌 Test Connection'}
            </button>

            {connectionStatus === 'connected' && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                borderRadius: 6,
                color: '#10b981',
                fontSize: 13,
              }}>
                ✓ Connection successful! You can now discover schemas and set up data pipelines.
              </div>
            )}

            {connectionStatus === 'failed' && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 6,
                color: '#fca5a5',
                fontSize: 13,
              }}>
                ✕ {connectionError}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schema' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Discover and import database schemas from your connected data sources.
            </p>
            
            <button
              onClick={discoverSchema}
              disabled={discovering}
              style={{
                background: discovering ? '#475569' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                color: 'white',
                cursor: discovering ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {discovering ? '🔍 Discovering...' : '🔍 Discover Schema'}
            </button>

            {discoveredTables.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ color: '#e2e8f0', fontSize: 14 }}>
                    Discovered Tables ({discoveredTables.length})
                  </h4>
                  <button
                    onClick={() => setSelectedTables(
                      selectedTables.length === discoveredTables.length ? [] : discoveredTables.map(t => t.name)
                    )}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      padding: '4px 12px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {selectedTables.length === discoveredTables.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {discoveredTables.map((table, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: selectedTables.includes(table.name) ? 'rgba(139, 92, 246, 0.1)' : '#0f172a',
                        border: `1px solid ${selectedTables.includes(table.name) ? '#8b5cf6' : '#334155'}`,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedTables(
                          selectedTables.includes(table.name)
                            ? selectedTables.filter(t => t !== table.name)
                            : [...selectedTables, table.name]
                        );
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={selectedTables.includes(table.name)}
                            readOnly
                          />
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>📋 {table.name}</span>
                        </div>
                        <span style={{ color: '#64748b', fontSize: 11 }}>
                          {formatNumber(table.rowCount)} rows
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {table.columns.map((col, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#1e293b',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              color: col.nullable ? '#94a3b8' : '#e2e8f0',
                            }}
                          >
                            {col.name}: <span style={{ color: '#60a5fa' }}>{col.type}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTables.length > 0 && (
                  <button
                    style={{
                      marginTop: 16,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 24px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    📥 Import {selectedTables.length} Table(s)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipelines' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Set up automated data pipelines to sync data between sources.
            </p>
            
            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              padding: 16, 
              marginBottom: 16,
              border: '1px solid #334155'
            }}>
              <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Create Pipeline</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newPipeline.name}
                  onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                  placeholder="Pipeline name"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <select
                  value={newPipeline.schedule}
                  onChange={(e) => setNewPipeline({ ...newPipeline, schedule: e.target.value })}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <input
                  type="text"
                  value={newPipeline.source}
                  onChange={(e) => setNewPipeline({ ...newPipeline, source: e.target.value })}
                  placeholder="Source (e.g., production_db.users)"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  value={newPipeline.destination}
                  onChange={(e) => setNewPipeline({ ...newPipeline, destination: e.target.value })}
                  placeholder="Destination (e.g., analytics.users)"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
              
              <button
                onClick={addPipeline}
                disabled={!newPipeline.name || !newPipeline.source || !newPipeline.destination}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                + Create Pipeline
              </button>
            </div>

            {pipelines.length > 0 && (
              <div>
                <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>
                  Active Pipelines ({pipelines.length})
                </h4>
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: pipeline.status === 'active' ? '#10b981' : pipeline.status === 'error' ? '#ef4444' : '#64748b',
                        }} />
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{pipeline.name}</span>
                        <span style={{
                          background: '#334155',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          color: '#94a3b8',
                        }}>
                          {pipeline.schedule}
                        </span>
                      </div>
                      <button
                        onClick={() => togglePipeline(pipeline.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #475569',
                          borderRadius: 4,
                          padding: '4px 10px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        {pipeline.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {pipeline.source} → {pipeline.destination}
                    </div>
                    {pipeline.lastRun && (
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                        Last run: {new Date(pipeline.lastRun).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Import data from files into your database tables.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, display: 'block' }}>
                File Format
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['csv', 'json', 'sql'] as const).map(format => (
                  <button
                    key={format}
                    onClick={() => setImportFormat(format)}
                    style={{
                      padding: '8px 20px',
                      background: importFormat === format ? '#3b82f6' : '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 12,
                      textTransform: 'uppercase',
                    }}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              border: '2px dashed #334155',
              borderRadius: 8,
              padding: 32,
              textAlign: 'center',
              marginBottom: 16,
              background: '#0f172a',
            }}>
              <input
                type="file"
                accept={importFormat === 'csv' ? '.csv' : importFormat === 'json' ? '.json' : '.sql'}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                <div style={{ color: '#e2e8f0', marginBottom: 4 }}>
                  {importFile ? importFile.name : 'Drop file here or click to upload'}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  Supported: .{importFormat} files
                </div>
              </label>
            </div>

            <button
              onClick={runImport}
              disabled={!importFile || importing}
              style={{
                background: !importFile || importing ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                color: 'white',
                cursor: !importFile || importing ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {importing ? '📥 Importing...' : '📥 Import Data'}
            </button>

            {importResult && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: importResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${importResult.success ? '#10b981' : '#ef4444'}`,
                borderRadius: 8,
              }}>
                <div style={{ color: importResult.success ? '#10b981' : '#ef4444', fontWeight: 600, marginBottom: 8 }}>
                  {importResult.success ? '✓ Import Successful' : '✕ Import Failed'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>
                  {formatNumber(importResult.rows)} rows imported
                </div>
                {importResult.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: '#f59e0b', fontSize: 12, marginBottom: 4 }}>
                      {importResult.errors.length} warning(s):
                    </div>
                    {importResult.errors.map((err, i) => (
                      <div key={i} style={{ color: '#fbbf24', fontSize: 11 }}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
