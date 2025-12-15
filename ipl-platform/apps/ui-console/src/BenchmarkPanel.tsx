import { useState } from 'react';

interface BenchmarkPanelProps {
  domain: string;
}

interface BenchmarkConfig {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: string;
  body: string;
  concurrentUsers: number;
  duration: number;
  rampUp: number;
}

interface BenchmarkSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  bytesTransferred: number;
}

interface BenchmarkRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface BenchmarkResult {
  summary: BenchmarkSummary;
  recommendations: BenchmarkRecommendation[];
  errors: Array<{ message: string; count: number }>;
  report: string;
}

export default function BenchmarkPanel({ domain }: BenchmarkPanelProps) {
  const [config, setConfig] = useState<BenchmarkConfig>({
    targetUrl: '',
    method: 'GET',
    headers: '',
    body: '',
    concurrentUsers: 10,
    duration: 30,
    rampUp: 5,
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async () => {
    if (!config.targetUrl) {
      setError('Please enter a target URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / config.duration), 95));
    }, 1000);

    try {
      const res = await fetch('/api/run-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: config.targetUrl,
          method: config.method,
          headers: config.headers ? JSON.parse(config.headers) : {},
          body: config.body,
          concurrentUsers: config.concurrentUsers,
          duration: config.duration,
          rampUp: config.rampUp,
        }),
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || 'Benchmark failed');
    }

    clearInterval(progressInterval);
    setProgress(100);
    setLoading(false);
  };

  const getGradeColor = (successRate: number, p99: number): string => {
    if (successRate >= 99 && p99 < 200) return '#10b981';
    if (successRate >= 95 && p99 < 500) return '#06b6d4';
    if (successRate >= 90 && p99 < 1000) return '#f0a040';
    return '#f04040';
  };

  const getGrade = (summary: BenchmarkSummary): string => {
    let score = 100;
    if (summary.successRate < 99) score -= 30;
    else if (summary.successRate < 99.9) score -= 10;
    if (summary.p99 > 1000) score -= 25;
    else if (summary.p99 > 500) score -= 15;
    if (summary.avgResponseTime > 500) score -= 20;
    else if (summary.avgResponseTime > 200) score -= 10;

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const downloadReport = () => {
    if (!result?.report) return;
    const blob = new Blob([result.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="benchmark-panel">
      <h2>App Benchmarking</h2>
      <p className="panel-description">
        Run performance tests against your API endpoints and measure response times, throughput, and latency.
      </p>

      <div className="benchmark-config">
        <div className="config-row">
          <div className="config-field wide">
            <label>Target URL</label>
            <input
              type="text"
              placeholder="https://api.example.com/endpoint"
              value={config.targetUrl}
              onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
            />
          </div>
          <div className="config-field">
            <label>Method</label>
            <select
              value={config.method}
              onChange={(e) => setConfig({ ...config, method: e.target.value as any })}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        <div className="config-row">
          <div className="config-field">
            <label>Concurrent Users</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.concurrentUsers}
              onChange={(e) => setConfig({ ...config, concurrentUsers: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="config-field">
            <label>Duration (seconds)</label>
            <input
              type="number"
              min="5"
              max="300"
              value={config.duration}
              onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div className="config-field">
            <label>Ramp-up (seconds)</label>
            <input
              type="number"
              min="0"
              max="60"
              value={config.rampUp}
              onChange={(e) => setConfig({ ...config, rampUp: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="config-row">
          <div className="config-field wide">
            <label>Headers (JSON, optional)</label>
            <input
              type="text"
              placeholder='{"Authorization": "Bearer token"}'
              value={config.headers}
              onChange={(e) => setConfig({ ...config, headers: e.target.value })}
            />
          </div>
        </div>

        {['POST', 'PUT'].includes(config.method) && (
          <div className="config-row">
            <div className="config-field wide">
              <label>Request Body (JSON)</label>
              <textarea
                placeholder='{"key": "value"}'
                value={config.body}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        )}

        <div className="config-actions">
          <button
            className="run-benchmark-btn"
            onClick={runBenchmark}
            disabled={loading || !config.targetUrl}
          >
            {loading ? 'Running Benchmark...' : 'Run Benchmark'}
          </button>
        </div>

        {loading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{Math.round(progress)}% - Testing in progress...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="benchmark-error">
          {error}
        </div>
      )}

      {result && (
        <div className="benchmark-results">
          <div className="results-header">
            <h3>Benchmark Results</h3>
            <button className="download-btn" onClick={downloadReport}>
              Download Report
            </button>
          </div>

          <div className="grade-section">
            <div
              className="grade-circle"
              style={{ borderColor: getGradeColor(result.summary.successRate, result.summary.p99) }}
            >
              <span className="grade">{getGrade(result.summary)}</span>
              <span className="grade-label">Performance</span>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-value">{result.summary.totalRequests.toLocaleString()}</span>
              <span className="metric-label">Total Requests</span>
            </div>
            <div className="metric-card success">
              <span className="metric-value">{result.summary.successRate.toFixed(1)}%</span>
              <span className="metric-label">Success Rate</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{result.summary.requestsPerSecond.toFixed(1)}</span>
              <span className="metric-label">Requests/sec</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{(result.summary.bytesTransferred / 1024).toFixed(1)} KB</span>
              <span className="metric-label">Data Transferred</span>
            </div>
          </div>

          <div className="latency-section">
            <h4>Response Time Analysis</h4>
            <div className="latency-grid">
              <div className="latency-item">
                <span className="latency-value">{result.summary.minResponseTime.toFixed(0)} ms</span>
                <span className="latency-label">Min</span>
              </div>
              <div className="latency-item">
                <span className="latency-value">{result.summary.avgResponseTime.toFixed(0)} ms</span>
                <span className="latency-label">Avg</span>
              </div>
              <div className="latency-item highlight">
                <span className="latency-value">{result.summary.p50.toFixed(0)} ms</span>
                <span className="latency-label">P50</span>
              </div>
              <div className="latency-item highlight">
                <span className="latency-value">{result.summary.p95.toFixed(0)} ms</span>
                <span className="latency-label">P95</span>
              </div>
              <div className="latency-item highlight">
                <span className="latency-value">{result.summary.p99.toFixed(0)} ms</span>
                <span className="latency-label">P99</span>
              </div>
              <div className="latency-item">
                <span className="latency-value">{result.summary.maxResponseTime.toFixed(0)} ms</span>
                <span className="latency-label">Max</span>
              </div>
            </div>
          </div>

          {result.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>Recommendations</h4>
              {result.recommendations.map((rec, i) => (
                <div key={i} className={`recommendation-item priority-${rec.priority}`}>
                  <div className="rec-header">
                    <span className="priority-badge">{rec.priority}</span>
                    <span className="rec-category">{rec.category}</span>
                  </div>
                  <strong>{rec.title}</strong>
                  <p>{rec.description}</p>
                </div>
              ))}
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="errors-section">
              <h4>Errors ({result.errors.reduce((a, e) => a + e.count, 0)} total)</h4>
              {result.errors.map((err, i) => (
                <div key={i} className="error-item">
                  <span className="error-count">{err.count}x</span>
                  <span className="error-message">{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
