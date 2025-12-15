import { useState } from 'react';

interface EnvironmentPanelProps {
  domain: string;
}

interface EnvVariable {
  key: string;
  value: string;
  secret: boolean;
}

interface Environment {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'deploying' | 'error';
  url: string;
  lastDeploy: string;
  version: string;
  variables: EnvVariable[];
}

export default function EnvironmentPanel({ domain: _domain }: EnvironmentPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'variables' | 'promote' | 'compare'>('overview');
  const [selectedEnv, setSelectedEnv] = useState<string>('development');
  
  const [environments, setEnvironments] = useState<Environment[]>([
    {
      id: 'development',
      name: 'Development',
      status: 'running',
      url: 'https://dev.example.com',
      lastDeploy: '2 hours ago',
      version: 'v1.2.3-dev.45',
      variables: [
        { key: 'DATABASE_URL', value: 'postgresql://dev:****@localhost:5432/dev_db', secret: true },
        { key: 'API_KEY', value: 'dev_api_key_****', secret: true },
        { key: 'LOG_LEVEL', value: 'debug', secret: false },
        { key: 'ENABLE_FEATURE_X', value: 'true', secret: false },
      ]
    },
    {
      id: 'staging',
      name: 'Staging',
      status: 'running',
      url: 'https://staging.example.com',
      lastDeploy: '1 day ago',
      version: 'v1.2.2',
      variables: [
        { key: 'DATABASE_URL', value: 'postgresql://staging:****@db.staging:5432/staging_db', secret: true },
        { key: 'API_KEY', value: 'staging_api_key_****', secret: true },
        { key: 'LOG_LEVEL', value: 'info', secret: false },
        { key: 'ENABLE_FEATURE_X', value: 'true', secret: false },
      ]
    },
    {
      id: 'production',
      name: 'Production',
      status: 'running',
      url: 'https://app.example.com',
      lastDeploy: '3 days ago',
      version: 'v1.2.1',
      variables: [
        { key: 'DATABASE_URL', value: 'postgresql://prod:****@db.prod:5432/prod_db', secret: true },
        { key: 'API_KEY', value: 'prod_api_key_****', secret: true },
        { key: 'LOG_LEVEL', value: 'warn', secret: false },
        { key: 'ENABLE_FEATURE_X', value: 'false', secret: false },
      ]
    }
  ]);

  const [newVariable, setNewVariable] = useState({ key: '', value: '', secret: false });
  const [promoteFrom, setPromoteFrom] = useState('staging');
  const [promoteTo, setPromoteTo] = useState('production');
  const [promoting, setPromoting] = useState(false);
  const [compareEnvs, setCompareEnvs] = useState<[string, string]>(['development', 'staging']);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10b981';
      case 'stopped': return '#64748b';
      case 'deploying': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '⚫';
      case 'deploying': return '🔄';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const currentEnv = environments.find(e => e.id === selectedEnv);

  const addVariable = () => {
    if (!newVariable.key || !newVariable.value) return;
    setEnvironments(environments.map(env => 
      env.id === selectedEnv 
        ? { ...env, variables: [...env.variables, { ...newVariable }] }
        : env
    ));
    setNewVariable({ key: '', value: '', secret: false });
  };

  const removeVariable = (key: string) => {
    setEnvironments(environments.map(env => 
      env.id === selectedEnv 
        ? { ...env, variables: env.variables.filter(v => v.key !== key) }
        : env
    ));
  };

  const handlePromote = async () => {
    setPromoting(true);
    await new Promise(r => setTimeout(r, 2000));
    
    const sourceEnv = environments.find(e => e.id === promoteFrom);
    if (sourceEnv) {
      setEnvironments(environments.map(env => 
        env.id === promoteTo 
          ? { ...env, version: sourceEnv.version, lastDeploy: 'just now', status: 'running' }
          : env
      ));
    }
    setPromoting(false);
  };

  const restartEnvironment = (envId: string) => {
    setEnvironments(environments.map(env => 
      env.id === envId ? { ...env, status: 'deploying' } : env
    ));
    setTimeout(() => {
      setEnvironments(prev => prev.map(env => 
        env.id === envId ? { ...env, status: 'running', lastDeploy: 'just now' } : env
      ));
    }, 2000);
  };

  const env1 = environments.find(e => e.id === compareEnvs[0]);
  const env2 = environments.find(e => e.id === compareEnvs[1]);

  const allKeys = [...new Set([
    ...(env1?.variables.map(v => v.key) || []),
    ...(env2?.variables.map(v => v.key) || [])
  ])];

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'overview', label: 'Overview', icon: '🌍' },
          { id: 'variables', label: 'Variables', icon: '🔑' },
          { id: 'promote', label: 'Promote', icon: '🚀' },
          { id: 'compare', label: 'Compare', icon: '⚖️' }
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
        {activeTab === 'overview' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Manage your application environments and deployments.
            </p>
            
            <div style={{ display: 'grid', gap: 12 }}>
              {environments.map((env) => (
                <div
                  key={env.id}
                  style={{
                    background: '#0f172a',
                    border: `1px solid ${selectedEnv === env.id ? '#f59e0b' : '#334155'}`,
                    borderRadius: 8,
                    padding: 16,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedEnv(env.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{getStatusIcon(env.status)}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>{env.name}</span>
                        <span style={{
                          background: `${getStatusColor(env.status)}20`,
                          color: getStatusColor(env.status),
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {env.status}
                        </span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#3b82f6' }}>{env.url}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                        <span>Version: <strong style={{ color: '#e2e8f0' }}>{env.version}</strong></span>
                        <span>Last deploy: <strong style={{ color: '#e2e8f0' }}>{env.lastDeploy}</strong></span>
                        <span>Variables: <strong style={{ color: '#e2e8f0' }}>{env.variables.length}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); restartEnvironment(env.id); }}
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
                        🔄 Restart
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(env.url, '_blank'); }}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 12px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        🔗 Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                Manage environment variables for each environment.
              </p>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              >
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
            </div>

            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              padding: 16, 
              marginBottom: 16,
              border: '1px solid #334155'
            }}>
              <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Add Variable</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newVariable.key}
                  onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value.toUpperCase() })}
                  placeholder="KEY_NAME"
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontFamily: 'monospace',
                  }}
                />
                <input
                  type={newVariable.secret ? 'password' : 'text'}
                  value={newVariable.value}
                  onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                  placeholder="value"
                  style={{
                    flex: 2,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontFamily: 'monospace',
                  }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={newVariable.secret}
                    onChange={(e) => setNewVariable({ ...newVariable, secret: e.target.checked })}
                  />
                  Secret
                </label>
                <button
                  onClick={addVariable}
                  disabled={!newVariable.key || !newVariable.value}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {currentEnv?.variables.map((variable, i) => (
                <div
                  key={i}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>
                      {variable.key}
                    </span>
                    <span style={{ color: '#64748b' }}>=</span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>
                      {variable.secret ? '••••••••' : variable.value}
                    </span>
                    {variable.secret && (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 600,
                      }}>
                        SECRET
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeVariable(variable.key)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      padding: '4px 8px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'promote' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Promote code and configurations between environments.
            </p>

            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              padding: 20, 
              border: '1px solid #334155',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 8 }}>From</label>
                  <select
                    value={promoteFrom}
                    onChange={(e) => setPromoteFrom(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '10px 20px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {environments.filter(e => e.id !== 'production').map(env => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                    {environments.find(e => e.id === promoteFrom)?.version}
                  </div>
                </div>

                <div style={{ 
                  color: '#f59e0b', 
                  fontSize: 32,
                  animation: promoting ? 'pulse 1s infinite' : 'none'
                }}>
                  →
                </div>

                <div style={{ textAlign: 'center' }}>
                  <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 8 }}>To</label>
                  <select
                    value={promoteTo}
                    onChange={(e) => setPromoteTo(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '10px 20px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {environments.filter(e => e.id !== 'development').map(env => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                    {environments.find(e => e.id === promoteTo)?.version}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  onClick={handlePromote}
                  disabled={promoting || promoteFrom === promoteTo}
                  style={{
                    background: promoting ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 32px',
                    color: 'white',
                    cursor: promoting ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {promoting ? '🔄 Promoting...' : '🚀 Promote Now'}
                </button>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid #f59e0b', 
              borderRadius: 8, 
              padding: 12 
            }}>
              <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Pre-promotion checklist:
              </div>
              <ul style={{ color: '#fcd34d', fontSize: 11, margin: 0, paddingLeft: 20 }}>
                <li>All tests passing in source environment</li>
                <li>Environment variables configured in target</li>
                <li>Database migrations applied</li>
                <li>Rollback plan documented</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Compare configurations between environments.
            </p>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <select
                value={compareEnvs[0]}
                onChange={(e) => setCompareEnvs([e.target.value, compareEnvs[1]])}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              >
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
              <span style={{ color: '#64748b', alignSelf: 'center' }}>vs</span>
              <select
                value={compareEnvs[1]}
                onChange={(e) => setCompareEnvs([compareEnvs[0], e.target.value])}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              >
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
            </div>

            <div style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: 1, 
                background: '#334155',
                borderBottom: '1px solid #334155'
              }}>
                <div style={{ background: '#1e293b', padding: 12, fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>
                  Variable
                </div>
                <div style={{ background: '#1e293b', padding: 12, fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>
                  {env1?.name}
                </div>
                <div style={{ background: '#1e293b', padding: 12, fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>
                  {env2?.name}
                </div>
              </div>
              
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {allKeys.map((key) => {
                  const val1 = env1?.variables.find(v => v.key === key);
                  const val2 = env2?.variables.find(v => v.key === key);
                  const isDifferent = val1?.value !== val2?.value;
                  
                  return (
                    <div 
                      key={key}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr', 
                        gap: 1, 
                        background: '#334155',
                        borderBottom: '1px solid #334155'
                      }}
                    >
                      <div style={{ 
                        background: isDifferent ? 'rgba(245, 158, 11, 0.1)' : '#0f172a', 
                        padding: 10,
                        color: '#f59e0b',
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }}>
                        {key}
                        {isDifferent && <span style={{ marginLeft: 8 }}>⚠️</span>}
                      </div>
                      <div style={{ 
                        background: !val1 ? 'rgba(239, 68, 68, 0.1)' : (isDifferent ? 'rgba(245, 158, 11, 0.1)' : '#0f172a'),
                        padding: 10,
                        color: val1 ? '#e2e8f0' : '#ef4444',
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }}>
                        {val1 ? (val1.secret ? '••••••••' : val1.value) : '(not set)'}
                      </div>
                      <div style={{ 
                        background: !val2 ? 'rgba(239, 68, 68, 0.1)' : (isDifferent ? 'rgba(245, 158, 11, 0.1)' : '#0f172a'),
                        padding: 10,
                        color: val2 ? '#e2e8f0' : '#ef4444',
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }}>
                        {val2 ? (val2.secret ? '••••••••' : val2.value) : '(not set)'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
