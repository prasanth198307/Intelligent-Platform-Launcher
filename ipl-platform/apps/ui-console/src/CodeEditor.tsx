import { useState, useEffect } from 'react';

interface CodeFile {
  path: string;
  content: string;
}

interface CodeEditorProps {
  files: CodeFile[];
  title?: string;
  onDownload?: () => void;
}

const getLanguage = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    py: 'python',
    go: 'go',
    sql: 'sql',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
  };
  return langMap[ext] || 'text';
};

const getFileIcon = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const name = path.split('/').pop()?.toLowerCase() || '';
  
  if (name === 'package.json') return '📦';
  if (name === 'dockerfile') return '🐳';
  if (name.includes('readme')) return '📖';
  if (name.includes('test')) return '🧪';
  
  const iconMap: Record<string, string> = {
    ts: '🔷',
    tsx: '⚛️',
    js: '🟨',
    jsx: '⚛️',
    json: '📋',
    css: '🎨',
    html: '🌐',
    py: '🐍',
    go: '🔵',
    sql: '🗃️',
    md: '📝',
    yaml: '⚙️',
    yml: '⚙️',
    sh: '💻',
  };
  return iconMap[ext] || '📄';
};

const syntaxHighlight = (code: string, language: string): string => {
  const keywords: Record<string, string[]> = {
    typescript: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'super', 'static', 'public', 'private', 'protected', 'readonly', 'default', 'as', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false'],
    javascript: ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'super', 'static', 'default', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false'],
    python: ['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'with', 'as', 'pass', 'break', 'continue', 'lambda', 'yield', 'global', 'nonlocal', 'and', 'or', 'not', 'is', 'in', 'True', 'False', 'None', 'self', 'async', 'await'],
    go: ['package', 'import', 'func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'go', 'defer', 'chan', 'select', 'var', 'const', 'type', 'struct', 'interface', 'map', 'make', 'new', 'nil', 'true', 'false', 'error'],
    sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'UNIQUE', 'DEFAULT', 'AUTO_INCREMENT', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'],
  };
  
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span style="color:#6b7280">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6b7280">$1</span>');
  
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:#10b981">$1</span>');
  
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f59e0b">$1</span>');
  
  const langKeywords = keywords[language] || keywords.typescript || [];
  langKeywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span style="color:#8b5cf6">$1</span>');
  });
  
  return highlighted;
};

export default function CodeEditor({ files, title = 'Generated Code', onDownload }: CodeEditorProps) {
  const [selectedFile, setSelectedFile] = useState(0);
  const [editedFiles, setEditedFiles] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setSelectedFile(0);
    setEditedFiles({});
  }, [files]);

  if (files.length === 0) {
    return (
      <div style={{
        background: '#1e293b',
        borderRadius: 8,
        padding: 40,
        textAlign: 'center',
        color: '#64748b',
      }}>
        No files generated yet. Generate mobile app or backend code to view files here.
      </div>
    );
  }

  const hasContent = files.some(f => f.content && f.content.length > 0);

  if (!hasContent) {
    return (
      <div style={{
        background: '#0f172a',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          gap: 12,
        }}>
          <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{title}</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>{files.length} files</span>
          <div style={{ flex: 1 }} />
          {onDownload && (
            <button
              onClick={onDownload}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: 4,
                padding: '6px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Download All
            </button>
          )}
        </div>
        <div style={{ padding: 16, maxHeight: 400, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
            {files.map((file, idx) => (
              <div key={idx} style={{ 
                background: '#1e293b', 
                borderRadius: 8, 
                padding: 10,
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <span>{getFileIcon(file.path)}</span>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>{file.path}</div>
                  {(file as any).description && (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{(file as any).description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredFiles = files.filter(f => 
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentFile = files[selectedFile];
  const currentContent = editedFiles[selectedFile] ?? currentFile?.content ?? '';
  const language = currentFile ? getLanguage(currentFile.path) : 'text';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditChange = (value: string) => {
    setEditedFiles({ ...editedFiles, [selectedFile]: value });
  };

  const folderStructure: Record<string, typeof files> = {};
  files.forEach((file) => {
    const parts = file.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    if (!folderStructure[folder]) folderStructure[folder] = [];
    folderStructure[folder].push({ ...file, path: file.path, content: file.content });
  });

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid #334155',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        gap: 12,
      }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{title}</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>{files.length} files</span>
        <div style={{ flex: 1 }} />
        {onDownload && (
          <button
            onClick={onDownload}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: 4,
              padding: '6px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ⬇️ Download All
          </button>
        )}
      </div>

      <div style={{ display: 'flex', height: 500 }}>
        <div style={{
          width: 240,
          borderRight: '1px solid #334155',
          overflow: 'auto',
          background: '#0f172a',
        }}>
          <div style={{ padding: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 4,
                padding: '6px 10px',
                color: '#e2e8f0',
                fontSize: 11,
              }}
            />
          </div>
          <div style={{ padding: '0 4px' }}>
            {(searchQuery ? filteredFiles : files).map((file, index) => {
              const actualIndex = searchQuery 
                ? files.findIndex(f => f.path === file.path)
                : index;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFile(actualIndex)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: 4,
                    background: actualIndex === selectedFile ? '#334155' : 'transparent',
                    color: actualIndex === selectedFile ? '#e2e8f0' : '#94a3b8',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span>{getFileIcon(file.path)}</span>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.path}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid #334155',
            background: '#1e293b',
            gap: 8,
          }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>{currentFile?.path}</span>
            <span style={{ 
              background: '#334155', 
              padding: '2px 8px', 
              borderRadius: 4, 
              fontSize: 10,
              color: '#818cf8',
            }}>
              {language}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: isEditing ? '#334155' : 'transparent',
                border: '1px solid #475569',
                borderRadius: 4,
                padding: '4px 10px',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {isEditing ? 'View' : 'Edit'}
            </button>
            <button
              onClick={handleCopy}
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
              Copy
            </button>
            <button
              onClick={handleDownloadFile}
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
              Download
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {isEditing ? (
              <textarea
                value={currentContent}
                onChange={(e) => handleEditChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0f172a',
                  border: 'none',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: 16,
                  resize: 'none',
                  outline: 'none',
                }}
                spellCheck={false}
              />
            ) : (
              <pre style={{
                margin: 0,
                padding: 16,
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.6,
                overflow: 'auto',
              }}>
                <code 
                  dangerouslySetInnerHTML={{ 
                    __html: syntaxHighlight(currentContent, language) 
                  }} 
                />
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
