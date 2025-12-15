import { useState, useEffect } from 'react';

interface MonitoringPanelProps {
  domain: string;
}

interface MetricData {
  timestamp: number;
  value: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  lastTriggered?: string;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: string;
}

export default function MonitoringPanel({ domain }: MonitoringPanelProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'logs' | 'alerts' | 'health'>('metrics');
  
  const [cpuData, setCpuData] = useState<MetricData[]>([]);
  const [memoryData, setMemoryData] = useState<MetricData[]>([]);
  const [requestsData, setRequestsData] = useState<MetricData[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [logSearch, setLogSearch] = useState('');
  
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', name: 'High CPU Usage', condition: 'cpu > 80%', threshold: 80, enabled: true },
    { id: '2', name: 'Memory Warning', condition: 'memory > 90%', threshold: 90, enabled: true },
    { id: '3', name: 'Error Rate Spike', condition: 'error_rate > 5%', threshold: 5, enabled: false },
    { id: '4', name: 'Slow Response Time', condition: 'p99 > 500ms', threshold: 500, enabled: true, lastTriggered: '2 hours ago' },
  ]);
  
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { service: 'API Server', status: 'healthy', latency: 45, lastCheck: '10s ago' },
    { service: 'Database', status: 'healthy', latency: 12, lastCheck: '10s ago' },
    { service: 'Cache (Redis)', status: 'healthy', latency: 3, lastCheck: '10s ago' },
    { service: 'Message Queue', status: 'degraded', latency: 234, lastCheck: '10s ago' },
    { service: 'External API', status: 'healthy', latency: 189, lastCheck: '10s ago' },
  ]);

  useEffect(() => {
    const generateMetrics = () => {
      const now = Date.now();
      const points = 30;
      
      setCpuData(Array.from({ length: points }, (_, i) => ({
        timestamp: now - (points - i) * 60000,
        value: 30 + Math.random() * 40
      })));
      
      setMemoryData(Array.from({ length: points }, (_, i) => ({
        timestamp: now - (points - i) * 60000,
        value: 50 + Math.random() * 30
      })));
      
      setRequestsData(Array.from({ length: points }, (_, i) => ({
        timestamp: now - (points - i) * 60000,
        value: Math.floor(100 + Math.random() * 200)
      })));
    };

    const generateLogs = () => {
      const sources = ['api-server', 'database', 'auth-service', 'worker', 'scheduler'];
      const messages = [
        { level: 'info' as const, msg: 'Request processed successfully' },
        { level: 'info' as const, msg: 'User authenticated' },
        { level: 'info' as const, msg: 'Cache hit for key user:12345' },
        { level: 'warn' as const, msg: 'Slow query detected (234ms)' },
        { level: 'warn' as const, msg: 'Rate limit approaching for IP 192.168.1.1' },
        { level: 'error' as const, msg: 'Failed to connect to external service' },
        { level: 'error' as const, msg: 'Database connection timeout' },
        { level: 'debug' as const, msg: 'Processing batch job #4521' },
      ];

      setLogs(Array.from({ length: 50 }, (_, i) => {
        const msg = messages[Math.floor(Math.random() * messages.length)];
        return {
          timestamp: new Date(Date.now() - i * 30000).toISOString(),
          level: msg.level,
          message: msg.msg,
          source: sources[Math.floor(Math.random() * sources.length)]
        };
      }));
    };

    generateMetrics();
    generateLogs();
    
    const interval = setInterval(() => {
      setCpuData(prev => [...prev.slice(1), { timestamp: Date.now(), value: 30 + Math.random() * 40 }]);
      setMemoryData(prev => [...prev.slice(1), { timestamp: Date.now(), value: 50 + Math.random() * 30 }]);
      setRequestsData(prev => [...prev.slice(1), { timestamp: Date.now(), value: Math.floor(100 + Math.random() * 200) }]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const refreshHealth = () => {
    setHealthChecks(healthChecks.map(h => ({
      ...h,
      latency: Math.floor(h.latency * (0.8 + Math.random() * 0.4)),
      lastCheck: 'just now',
      status: Math.random() > 0.9 ? 'degraded' : 'healthy'
    })));
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'down': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderMiniChart = (data: MetricData[], color: string, height: number = 60) => {
    if (data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - ((d.value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const filteredLogs = logs
    .filter(log => logFilter === 'all' || log.level === logFilter)
    .filter(log => !logSearch || log.message.toLowerCase().includes(logSearch.toLowerCase()) || log.source.includes(logSearch));

  const currentCpu = cpuData[cpuData.length - 1]?.value || 0;
  const currentMemory = memoryData[memoryData.length - 1]?.value || 0;
  const currentRequests = requestsData[requestsData.length - 1]?.value || 0;

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'metrics', label: 'Metrics', icon: '📈' },
          { id: 'logs', label: 'Logs', icon: '📋' },
          { id: 'alerts', label: 'Alerts', icon: '🔔' },
          { id: 'health', label: 'Health', icon: '💚' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? '#334155' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
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
        {activeTab === 'metrics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                Real-time application metrics and performance data.
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['1h', '6h', '24h', '7d'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                      padding: '4px 10px',
                      background: timeRange === range ? '#3b82f6' : 'transparent',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>CPU Usage</span>
                  <span style={{ color: currentCpu > 70 ? '#f59e0b' : '#10b981', fontWeight: 700, fontSize: 20 }}>
                    {currentCpu.toFixed(1)}%
                  </span>
                </div>
                {renderMiniChart(cpuData, currentCpu > 70 ? '#f59e0b' : '#10b981')}
              </div>
              
              <div style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Memory Usage</span>
                  <span style={{ color: currentMemory > 80 ? '#ef4444' : '#3b82f6', fontWeight: 700, fontSize: 20 }}>
                    {currentMemory.toFixed(1)}%
                  </span>
                </div>
                {renderMiniChart(memoryData, currentMemory > 80 ? '#ef4444' : '#3b82f6')}
              </div>
              
              <div style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Requests/min</span>
                  <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 20 }}>
                    {currentRequests}
                  </span>
                </div>
                {renderMiniChart(requestsData, '#8b5cf6')}
              </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
              <h4 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: 14 }}>Key Metrics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Avg Response', value: '124ms', color: '#10b981' },
                  { label: 'P99 Latency', value: '456ms', color: '#f59e0b' },
                  { label: 'Error Rate', value: '0.12%', color: '#10b981' },
                  { label: 'Throughput', value: '1.2K/s', color: '#3b82f6' },
                ].map((metric, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ color: metric.color, fontSize: 24, fontWeight: 700 }}>{metric.value}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs..."
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'info', 'warn', 'error'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    style={{
                      padding: '8px 12px',
                      background: logFilter === level ? getLogLevelColor(level === 'all' ? 'info' : level) : 'transparent',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 11,
                      textTransform: 'uppercase',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ 
              background: '#0f172a', 
              borderRadius: 8, 
              maxHeight: 400, 
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 11,
            }}>
              {filteredLogs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <span style={{ color: '#64748b', minWidth: 80 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{ 
                    color: getLogLevelColor(log.level), 
                    minWidth: 50,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {log.level}
                  </span>
                  <span style={{ color: '#8b5cf6', minWidth: 100 }}>[{log.source}]</span>
                  <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Configure alerts to get notified when metrics exceed thresholds.
            </p>
            
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: '#0f172a',
                    border: `1px solid ${alert.enabled ? '#334155' : '#1e293b'}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    opacity: alert.enabled ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>
                        🔔 {alert.name}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        Condition: <code style={{ color: '#f59e0b' }}>{alert.condition}</code>
                      </div>
                      {alert.lastTriggered && (
                        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
                          Last triggered: {alert.lastTriggered}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      style={{
                        background: alert.enabled ? '#10b981' : '#475569',
                        border: 'none',
                        borderRadius: 20,
                        padding: '6px 16px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {alert.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{
                marginTop: 16,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              + Create New Alert
            </button>
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                Service health status and availability monitoring.
              </p>
              <button
                onClick={refreshHealth}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '6px 16px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                🔄 Refresh
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 12, 
              marginBottom: 16 
            }}>
              {[
                { label: 'Healthy', count: healthChecks.filter(h => h.status === 'healthy').length, color: '#10b981' },
                { label: 'Degraded', count: healthChecks.filter(h => h.status === 'degraded').length, color: '#f59e0b' },
                { label: 'Down', count: healthChecks.filter(h => h.status === 'down').length, color: '#ef4444' },
              ].map((stat, i) => (
                <div key={i} style={{ 
                  background: '#0f172a', 
                  borderRadius: 8, 
                  padding: 16,
                  textAlign: 'center',
                  borderLeft: `4px solid ${stat.color}`
                }}>
                  <div style={{ color: stat.color, fontSize: 32, fontWeight: 700 }}>{stat.count}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {healthChecks.map((check, i) => (
                <div
                  key={i}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: getStatusColor(check.status),
                    }} />
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{check.service}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>
                        Latency: {check.latency}ms • Checked: {check.lastCheck}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: `${getStatusColor(check.status)}20`,
                    color: getStatusColor(check.status),
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
