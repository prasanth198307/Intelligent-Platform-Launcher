import { useState } from 'react';

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export default function ApiTestPanel() {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('{\n  \n}');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof Header, value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const sendRequest = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const headersObj: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => {
        headersObj[h.key] = h.value;
      });

      const options: RequestInit = {
        method,
        headers: headersObj,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const endTime = performance.now();
      
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: string;
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: Math.round(endTime - startTime),
        size: new Blob([responseBody]).size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response.body);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#10b981';
    if (status >= 300 && status < 400) return '#f59e0b';
    if (status >= 400 && status < 500) return '#f97316';
    return '#ef4444';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '8px 12px',
            color: method === 'GET' ? '#10b981' : 
                   method === 'POST' ? '#3b82f6' : 
                   method === 'PUT' ? '#f59e0b' : 
                   method === 'DELETE' ? '#ef4444' : '#8b5cf6',
            fontWeight: 'bold',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter request URL (e.g., https://api.example.com/users)"
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
        <button
          onClick={sendRequest}
          disabled={loading}
          style={{
            background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: 6,
            padding: '8px 24px',
            color: 'white',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('headers')}
          style={{
            background: activeTab === 'headers' ? '#3b82f6' : 'transparent',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '6px 16px',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Headers ({headers.filter(h => h.enabled).length})
        </button>
        <button
          onClick={() => setActiveTab('body')}
          style={{
            background: activeTab === 'body' ? '#3b82f6' : 'transparent',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '6px 16px',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Body
        </button>
      </div>

      {activeTab === 'headers' && (
        <div style={{ marginBottom: 16 }}>
          {headers.map((header, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <input
                type="text"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                placeholder="Header name"
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '6px 10px',
                  color: '#e2e8f0',
                  fontSize: 12,
                }}
              />
              <input
                type="text"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                placeholder="Header value"
                style={{
                  flex: 2,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '6px 10px',
                  color: '#e2e8f0',
                  fontSize: 12,
                }}
              />
              <button
                onClick={() => removeHeader(index)}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: 4,
                  padding: '6px 10px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addHeader}
            style={{
              background: 'transparent',
              border: '1px dashed #475569',
              borderRadius: 4,
              padding: '6px 12px',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 12,
              width: '100%',
            }}
          >
            + Add Header
          </button>
        </div>
      )}

      {activeTab === 'body' && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Request body (JSON)"
            style={{
              width: '100%',
              height: 150,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: 12,
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: 12,
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: 6,
          padding: 12,
          color: '#fca5a5',
          marginBottom: 16,
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {response && (
        <div style={{ 
          background: '#0f172a', 
          borderRadius: 8, 
          overflow: 'hidden',
          border: '1px solid #334155',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            padding: '10px 16px',
            borderBottom: '1px solid #334155',
            background: '#1e293b',
          }}>
            <span style={{ 
              color: getStatusColor(response.status),
              fontWeight: 'bold',
              fontSize: 14,
            }}>
              {response.status} {response.statusText}
            </span>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {response.time}ms
            </span>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {formatSize(response.size)}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={() => setResponseTab('body')}
                style={{
                  background: responseTab === 'body' ? '#334155' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Body
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                style={{
                  background: responseTab === 'headers' ? '#334155' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Headers
              </button>
              <button
                onClick={copyResponse}
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
                Copy
              </button>
            </div>
          </div>
          
          {responseTab === 'body' && (
            <pre style={{
              padding: 16,
              margin: 0,
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 400,
              overflow: 'auto',
            }}>
              {response.body}
            </pre>
          )}
          
          {responseTab === 'headers' && (
            <div style={{ padding: 16 }}>
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} style={{ 
                  display: 'flex', 
                  gap: 8, 
                  marginBottom: 6,
                  fontSize: 12,
                }}>
                  <span style={{ color: '#818cf8', minWidth: 150 }}>{key}:</span>
                  <span style={{ color: '#e2e8f0' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
