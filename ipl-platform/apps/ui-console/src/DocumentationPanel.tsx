import { useState } from 'react';

interface DocumentationPanelProps {
  domain: string;
  requirements?: string;
  infrastructure?: any;
  techStack?: any;
  tables?: any[];
  security?: any[];
  deploymentType?: string;
  cloudProvider?: string;
  compliance?: string[];
}

interface GeneratedFile {
  name: string;
  content: string;
  type: string;
}

export default function DocumentationPanel(props: DocumentationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [projectName, setProjectName] = useState('');

  const generateDocumentation = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/generate-documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: props.domain,
          projectName: projectName || `${props.domain.charAt(0).toUpperCase() + props.domain.slice(1)} Platform`,
          requirements: props.requirements,
          infrastructure: props.infrastructure,
          techStack: props.techStack,
          tables: props.tables,
          security: props.security,
          deploymentType: props.deploymentType,
          cloudProvider: props.cloudProvider,
          compliance: props.compliance,
        }),
      });

      const data = await response.json();
      if (data.ok && data.files) {
        setFiles(data.files);
        setSelectedFile(data.files[0]);
      }
    } catch (error) {
      console.error('Documentation generation failed:', error);
    }
    setLoading(false);
  };

  const downloadFile = (file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    files.forEach(file => downloadFile(file));
  };

  const fileIcons: Record<string, string> = {
    'readme': '📖',
    'architecture': '🏗️',
    'installation': '📦',
    'user-guide': '👤',
    'api-reference': '🔌',
  };

  return (
    <div className="documentation-panel" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>Project Documentation Generator</h3>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Generate comprehensive documentation for your application including README, architecture docs, installation guide, user guide, and API reference.
        </p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '12px' }}>
            Project Name (optional)
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={`${props.domain.charAt(0).toUpperCase() + props.domain.slice(1)} Platform`}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '14px',
            }}
          />
        </div>
        <button
          onClick={generateDocumentation}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: loading ? 'rgba(139, 92, 246, 0.5)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {loading ? 'Generating...' : 'Generate Documentation'}
        </button>
      </div>

      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ width: '220px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Generated Files
              </span>
              <button
                onClick={downloadAll}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Download All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {files.map((file) => (
                <div
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  style={{
                    padding: '10px 12px',
                    background: selectedFile?.name === file.name ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: selectedFile?.name === file.name ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{fileIcons[file.type] || '📄'}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{file.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedFile && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                    {fileIcons[selectedFile.type] || '📄'} {selectedFile.name}
                  </span>
                  <button
                    onClick={() => downloadFile(selectedFile)}
                    style={{
                      padding: '6px 14px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Download
                  </button>
                </div>
                <pre
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '8px',
                    padding: '16px',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    overflow: 'auto',
                    maxHeight: '500px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                  {selectedFile.content}
                </pre>
              </>
            )}
          </div>
        </div>
      )}

      {files.length === 0 && !loading && (
        <div style={{
          padding: '40px',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#94a3b8',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
          <div>Click "Generate Documentation" to create project documentation</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#64748b' }}>
            Includes README, Architecture, Installation Guide, User Guide, and API Reference
          </div>
        </div>
      )}
    </div>
  );
}
