import { useState } from 'react';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

interface CodeReviewIssue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  suggestion?: string;
}

interface AICodePanelProps {
  domain: string;
  database: string;
  entityCount: number;
  transactionsPerDay: number;
  compliance: string[];
  deploymentType: string;
  modules?: { name: string; description: string }[];
  screens?: { name: string; type: string }[];
  tables?: { name: string; columns: { name: string; type: string }[] }[];
}

export default function AICodePanel({
  domain,
  database,
  entityCount,
  transactionsPerDay,
  compliance,
  deploymentType,
  modules,
  screens,
  tables
}: AICodePanelProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'review' | 'fix' | 'explain'>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  
  const [codeToReview, setCodeToReview] = useState('');
  const [reviewLanguage, setReviewLanguage] = useState('typescript');
  const [reviewResult, setReviewResult] = useState<{
    score: number;
    issues: CodeReviewIssue[];
    summary: string;
    improvements: string[];
  } | null>(null);
  
  const [codeToFix, setCodeToFix] = useState('');
  const [issuesToFix, setIssuesToFix] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [fixResult, setFixResult] = useState<{
    fixedCode: string;
    changes: { line: number; description: string }[];
    summary: string;
  } | null>(null);

  const [codeToExplain, setCodeToExplain] = useState('');
  const [explainResult, setExplainResult] = useState<{
    explanation: string;
    concepts: string[];
  } | null>(null);

  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          entityCount,
          transactionsPerDay,
          database,
          compliance,
          deploymentType,
          modules,
          screens,
          tables,
          framework: 'react',
          language: 'typescript'
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedFiles(data.files || []);
      if (data.files?.length > 0) {
        setSelectedFile(data.files[0]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCode = async () => {
    if (!codeToReview.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToReview,
          language: reviewLanguage,
          context: `${domain} application`
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Review failed');
      setReviewResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFixCode = async () => {
    if (!codeToFix.trim() || issuesToFix.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/fix-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToFix,
          language: reviewLanguage,
          issues: issuesToFix
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Fix failed');
      setFixResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainCode = async () => {
    if (!codeToExplain.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/explain-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToExplain,
          language: reviewLanguage
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Explanation failed');
      setExplainResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addIssue = () => {
    if (newIssue.trim()) {
      setIssuesToFix([...issuesToFix, newIssue.trim()]);
      setNewIssue('');
    }
  };

  const removeIssue = (index: number) => {
    setIssuesToFix(issuesToFix.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllFiles = () => {
    const allContent = generatedFiles.map(f => 
      `// ========== ${f.path} ==========\n// ${f.description}\n\n${f.content}\n\n`
    ).join('\n');
    const blob = new Blob([allContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-application-code.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-code-panel">
      <div className="ai-code-header">
        <h2>AI Code Assistant</h2>
        <div className="ai-tabs">
          <button 
            className={activeTab === 'generate' ? 'active' : ''} 
            onClick={() => setActiveTab('generate')}
          >
            Generate Code
          </button>
          <button 
            className={activeTab === 'review' ? 'active' : ''} 
            onClick={() => setActiveTab('review')}
          >
            Review Code
          </button>
          <button 
            className={activeTab === 'fix' ? 'active' : ''} 
            onClick={() => setActiveTab('fix')}
          >
            Fix Issues
          </button>
          <button 
            className={activeTab === 'explain' ? 'active' : ''} 
            onClick={() => setActiveTab('explain')}
          >
            Explain Code
          </button>
        </div>
      </div>

      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="ai-generate-tab">
          <div className="generate-info">
            <p>Generate production-ready code for your <strong>{domain}</strong> application.</p>
            <div className="context-summary">
              <span>Database: {database}</span>
              <span>Scale: {entityCount.toLocaleString()} entities</span>
              <span>Deployment: {deploymentType}</span>
            </div>
          </div>
          
          <button 
            className="generate-btn" 
            onClick={handleGenerateCode}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Application Code'}
          </button>

          {generatedFiles.length > 0 && (
            <div className="generated-files">
              <div className="files-header">
                <h3>Generated Files ({generatedFiles.length})</h3>
                <button onClick={downloadAllFiles} className="download-all-btn">
                  Download All
                </button>
              </div>
              <div className="files-list">
                {generatedFiles.map((file, i) => (
                  <div 
                    key={i} 
                    className={`file-item ${selectedFile === file ? 'selected' : ''}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <span className="file-path">{file.path}</span>
                    <span className="file-lang">{file.language}</span>
                  </div>
                ))}
              </div>
              {selectedFile && (
                <div className="file-preview">
                  <div className="preview-header">
                    <span>{selectedFile.path}</span>
                    <span className="file-desc">{selectedFile.description}</span>
                    <div className="preview-actions">
                      <button onClick={() => copyToClipboard(selectedFile.content)}>Copy</button>
                      <button onClick={() => downloadFile(selectedFile)}>Download</button>
                    </div>
                  </div>
                  <pre className="code-block">
                    <code>{selectedFile.content}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'review' && (
        <div className="ai-review-tab">
          <div className="language-select">
            <label>Language:</label>
            <select value={reviewLanguage} onChange={(e) => setReviewLanguage(e.target.value)}>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          
          <textarea
            className="code-input"
            placeholder="Paste your code here for review..."
            value={codeToReview}
            onChange={(e) => setCodeToReview(e.target.value)}
            rows={12}
          />
          
          <button 
            className="review-btn" 
            onClick={handleReviewCode}
            disabled={loading || !codeToReview.trim()}
          >
            {loading ? 'Analyzing...' : 'Review Code'}
          </button>

          {reviewResult && (
            <div className="review-result">
              <div className="review-score">
                <div className={`score-circle ${reviewResult.score >= 80 ? 'good' : reviewResult.score >= 60 ? 'fair' : 'poor'}`}>
                  <span className="score-value">{reviewResult.score}</span>
                  <span className="score-label">/ 100</span>
                </div>
                <p className="review-summary">{reviewResult.summary}</p>
              </div>

              {reviewResult.issues.length > 0 && (
                <div className="issues-list">
                  <h4>Issues Found ({reviewResult.issues.length})</h4>
                  {reviewResult.issues.map((issue, i) => (
                    <div key={i} className={`issue-item severity-${issue.severity}`}>
                      <div className="issue-header">
                        <span className={`severity-badge ${issue.severity}`}>{issue.severity}</span>
                        {issue.line && <span className="issue-line">Line {issue.line}</span>}
                      </div>
                      <p className="issue-message">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="issue-suggestion">Suggestion: {issue.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {reviewResult.improvements.length > 0 && (
                <div className="improvements-list">
                  <h4>Suggested Improvements</h4>
                  <ul>
                    {reviewResult.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'fix' && (
        <div className="ai-fix-tab">
          <div className="language-select">
            <label>Language:</label>
            <select value={reviewLanguage} onChange={(e) => setReviewLanguage(e.target.value)}>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>
          
          <textarea
            className="code-input"
            placeholder="Paste your code that needs fixing..."
            value={codeToFix}
            onChange={(e) => setCodeToFix(e.target.value)}
            rows={10}
          />

          <div className="issues-input">
            <h4>Issues to Fix</h4>
            <div className="add-issue">
              <input
                type="text"
                placeholder="Describe an issue (e.g., 'Remove console.log statements')"
                value={newIssue}
                onChange={(e) => setNewIssue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIssue()}
              />
              <button onClick={addIssue}>Add</button>
            </div>
            {issuesToFix.length > 0 && (
              <ul className="issues-to-fix-list">
                {issuesToFix.map((issue, i) => (
                  <li key={i}>
                    <span>{issue}</span>
                    <button onClick={() => removeIssue(i)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <button 
            className="fix-btn" 
            onClick={handleFixCode}
            disabled={loading || !codeToFix.trim() || issuesToFix.length === 0}
          >
            {loading ? 'Fixing...' : 'Fix Code'}
          </button>

          {fixResult && (
            <div className="fix-result">
              <h4>Fixed Code</h4>
              <p className="fix-summary">{fixResult.summary}</p>
              
              {fixResult.changes.length > 0 && (
                <div className="changes-list">
                  <h5>Changes Made:</h5>
                  <ul>
                    {fixResult.changes.map((change, i) => (
                      <li key={i}>Line {change.line}: {change.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="fixed-code-preview">
                <div className="preview-header">
                  <span>Fixed Code</span>
                  <button onClick={() => copyToClipboard(fixResult.fixedCode)}>Copy</button>
                </div>
                <pre className="code-block">
                  <code>{fixResult.fixedCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'explain' && (
        <div className="ai-explain-tab">
          <div className="language-select">
            <label>Language:</label>
            <select value={reviewLanguage} onChange={(e) => setReviewLanguage(e.target.value)}>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
            </select>
          </div>
          
          <textarea
            className="code-input"
            placeholder="Paste code you want explained..."
            value={codeToExplain}
            onChange={(e) => setCodeToExplain(e.target.value)}
            rows={10}
          />
          
          <button 
            className="explain-btn" 
            onClick={handleExplainCode}
            disabled={loading || !codeToExplain.trim()}
          >
            {loading ? 'Analyzing...' : 'Explain Code'}
          </button>

          {explainResult && (
            <div className="explain-result">
              <div className="explanation">
                <h4>Explanation</h4>
                <p>{explainResult.explanation}</p>
              </div>
              
              {explainResult.concepts.length > 0 && (
                <div className="concepts">
                  <h4>Key Concepts Used</h4>
                  <div className="concept-tags">
                    {explainResult.concepts.map((concept, i) => (
                      <span key={i} className="concept-tag">{concept}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
