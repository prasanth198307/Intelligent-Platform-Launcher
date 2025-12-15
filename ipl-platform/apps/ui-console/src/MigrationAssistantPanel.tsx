import { useState } from 'react';

interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  rowCount: number;
  sizeBytes: number;
}

interface ColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  length?: number;
}

interface IndexSchema {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  isClustered: boolean;
  type: string;
}

interface ConstraintSchema {
  name: string;
  tableName: string;
  type: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

interface SourceSchema {
  tables: TableSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
  partitions: { tableName: string; partitionColumn: string; partitionType: string }[];
  views: { name: string; definition: string }[];
  procedures: { name: string; type: string; definition: string }[];
  triggers: { name: string; tableName: string; event: string }[];
}

interface MigrationPhase {
  name: string;
  description: string;
  durationDays: number;
  tasks: { name: string; description: string; type: string; estimatedHours: number }[];
}

interface MigrationRisk {
  severity: string;
  category: string;
  description: string;
  mitigation: string;
}

interface DataTypeConversion {
  sourceType: string;
  targetType: string;
  notes: string;
  potentialIssues?: string;
}

interface MigrationPlan {
  phases: MigrationPhase[];
  totalDays: number;
  totalHours: number;
  risks: MigrationRisk[];
  recommendations: string[];
  dataTypeConversions: DataTypeConversion[];
}

interface PerformanceSuggestion {
  category: string;
  title: string;
  description: string;
  impact: string;
  implementation: string;
}

interface AnalysisResult {
  summary: {
    totalTables: number;
    totalRows: number;
    totalSizeGB: number;
    totalIndexes: number;
    totalConstraints: number;
    totalPartitions: number;
    totalViews: number;
    totalProcedures: number;
    totalTriggers: number;
  };
  complexity: string;
  estimatedMigrationDays: number;
}

const SOURCE_DATABASES = [
  { id: 'mssql', name: 'Microsoft SQL Server' },
  { id: 'mysql', name: 'MySQL' },
  { id: 'oracle', name: 'Oracle' },
  { id: 'postgresql', name: 'PostgreSQL' },
];

const TARGET_DATABASES = [
  { id: 'postgresql', name: 'PostgreSQL (Recommended)' },
];

interface Props {
  onClose?: () => void;
}

export default function MigrationAssistantPanel({ onClose }: Props) {
  const [sourceDatabase, setSourceDatabase] = useState('mssql');
  const [targetDatabase, setTargetDatabase] = useState('postgresql');
  const [schemaInput, setSchemaInput] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'analysis' | 'plan' | 'ddl' | 'performance'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [parsedSchema, setParsedSchema] = useState<SourceSchema | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [generatedDDL, setGeneratedDDL] = useState<string>('');
  const [conversionNotes, setConversionNotes] = useState<string[]>([]);
  const [performanceSuggestions, setPerformanceSuggestions] = useState<PerformanceSuggestion[]>([]);
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSchemaInput(content);
    };
    reader.readAsText(file);
  };

  const analyzeWithAI = async () => {
    if (!schemaInput.trim()) {
      setError('Please enter your database schema or DDL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/migration/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDatabase,
          targetDatabase,
          schemaText: schemaInput,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'AI analysis failed');
      }

      let analysisResult = data.analysis;
      if (typeof analysisResult === 'string') {
        const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        }
      }

      const schema: SourceSchema = {
        tables: analysisResult.tables || [],
        indexes: analysisResult.indexes || [],
        constraints: analysisResult.constraints || [],
        partitions: analysisResult.partitions || [],
        views: analysisResult.views || [],
        procedures: analysisResult.procedures || [],
        triggers: analysisResult.triggers || [],
      };

      setParsedSchema(schema);
      setAiNotes([
        ...(analysisResult.migrationNotes || []),
        ...(analysisResult.dataTypeIssues || []),
        ...(analysisResult.performanceRecommendations || []),
      ]);

      await runAnalysis(schema);
      setActiveTab('analysis');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze schema');
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async (schema: SourceSchema) => {
    try {
      const response = await fetch('/api/migration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });

      const data = await response.json();
      if (data.ok) {
        setAnalysis({
          summary: data.summary,
          complexity: data.complexity,
          estimatedMigrationDays: data.estimatedMigrationDays,
        });
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const generatePlan = async () => {
    if (!parsedSchema) {
      setError('Please analyze your schema first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/migration/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDatabase,
          targetDatabase,
          schema: parsedSchema,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to generate migration plan');
      }

      setMigrationPlan({
        phases: data.phases,
        totalDays: data.totalDays,
        totalHours: data.totalHours,
        risks: data.risks,
        recommendations: data.recommendations,
        dataTypeConversions: data.dataTypeConversions,
      });
      setActiveTab('plan');
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDDL = async () => {
    if (!parsedSchema) {
      setError('Please analyze your schema first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/migration/convert-ddl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDatabase,
          targetDatabase,
          schema: parsedSchema,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to generate DDL');
      }

      setGeneratedDDL(data.ddl);
      setConversionNotes(data.conversionNotes || []);
      setActiveTab('ddl');
    } catch (err: any) {
      setError(err.message || 'Failed to generate DDL');
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceSuggestions = async () => {
    if (!parsedSchema) {
      setError('Please analyze your schema first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/migration/performance-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDatabase,
          schema: parsedSchema,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to get performance suggestions');
      }

      setPerformanceSuggestions(data.suggestions || []);
      setActiveTab('performance');
    } catch (err: any) {
      setError(err.message || 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDDL = () => {
    const blob = new Blob([generatedDDL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_${sourceDatabase}_to_${targetDatabase}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPlan = () => {
    if (!migrationPlan) return;
    const planText = JSON.stringify(migrationPlan, null, 2);
    const blob = new Blob([planText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_plan_${sourceDatabase}_to_${targetDatabase}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="migration-assistant-panel">
      <div className="migration-header">
        <h2>Database Migration Assistant</h2>
        {onClose && <button className="close-btn" onClick={onClose}>×</button>}
      </div>

      <div className="migration-tabs">
        <button 
          className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          1. Schema Input
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          disabled={!analysis}
        >
          2. Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
          disabled={!migrationPlan}
        >
          3. Migration Plan
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ddl' ? 'active' : ''}`}
          onClick={() => setActiveTab('ddl')}
          disabled={!generatedDDL}
        >
          4. Target DDL
        </button>
        <button 
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
          disabled={performanceSuggestions.length === 0}
        >
          5. Performance
        </button>
      </div>

      {error && (
        <div className="migration-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="migration-content">
        {activeTab === 'input' && (
          <div className="input-section">
            <div className="db-selection">
              <div className="db-select-group">
                <label>Source Database:</label>
                <select value={sourceDatabase} onChange={(e) => setSourceDatabase(e.target.value)}>
                  {SOURCE_DATABASES.map(db => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
              </div>
              <div className="db-arrow">→</div>
              <div className="db-select-group">
                <label>Target Database:</label>
                <select value={targetDatabase} onChange={(e) => setTargetDatabase(e.target.value)}>
                  {TARGET_DATABASES.map(db => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="schema-input-section">
              <div className="schema-input-header">
                <label>Enter your database schema (DDL, CREATE TABLE statements, or description):</label>
                <label className="file-upload-btn">
                  Upload SQL File
                  <input 
                    type="file" 
                    accept=".sql,.txt,.ddl"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <textarea
                className="schema-textarea"
                value={schemaInput}
                onChange={(e) => setSchemaInput(e.target.value)}
                placeholder={`Example:
CREATE TABLE customers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  customer_id INT FOREIGN KEY REFERENCES customers(id),
  total MONEY NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
);

-- Or describe your schema:
-- Tables: users (10M rows), orders (50M rows), products (100K rows)
-- Indexes: clustered on primary keys, nonclustered on foreign keys
-- Partitioned: orders by created_date (monthly)`}
                rows={15}
              />
            </div>

            <div className="action-buttons">
              <button 
                className="primary-btn"
                onClick={analyzeWithAI}
                disabled={isLoading || !schemaInput.trim()}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Schema with AI'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && analysis && (
          <div className="analysis-section">
            <div className="analysis-summary">
              <h3>Schema Analysis Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalTables}</div>
                  <div className="summary-label">Tables</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalRows.toLocaleString()}</div>
                  <div className="summary-label">Total Rows</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalSizeGB} GB</div>
                  <div className="summary-label">Database Size</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalIndexes}</div>
                  <div className="summary-label">Indexes</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalConstraints}</div>
                  <div className="summary-label">Constraints</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{analysis.summary.totalProcedures}</div>
                  <div className="summary-label">Procedures</div>
                </div>
              </div>

              <div className="complexity-badge">
                <span className={`badge complexity-${analysis.complexity}`}>
                  Complexity: {analysis.complexity.toUpperCase()}
                </span>
                <span className="days-estimate">
                  Estimated Duration: {analysis.estimatedMigrationDays} days
                </span>
              </div>
            </div>

            {parsedSchema && parsedSchema.tables.length > 0 && (
              <div className="tables-list">
                <h4>Detected Tables ({parsedSchema.tables.length})</h4>
                <div className="table-grid">
                  {parsedSchema.tables.map((table, idx) => (
                    <div key={idx} className="table-card">
                      <div className="table-name">{table.name}</div>
                      <div className="table-details">
                        <span>{table.columns.length} columns</span>
                        {table.rowCount > 0 && <span>{table.rowCount.toLocaleString()} rows</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiNotes.length > 0 && (
              <div className="ai-notes">
                <h4>AI Analysis Notes</h4>
                <ul>
                  {aiNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="action-buttons">
              <button className="primary-btn" onClick={generatePlan} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Migration Plan'}
              </button>
              <button className="secondary-btn" onClick={generateDDL} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Target DDL'}
              </button>
              <button className="secondary-btn" onClick={getPerformanceSuggestions} disabled={isLoading}>
                Get Performance Suggestions
              </button>
            </div>
          </div>
        )}

        {activeTab === 'plan' && migrationPlan && (
          <div className="plan-section">
            <div className="plan-header">
              <h3>Migration Plan: {sourceDatabase.toUpperCase()} → {targetDatabase.toUpperCase()}</h3>
              <div className="plan-summary">
                <span className="plan-stat">Total Duration: <strong>{migrationPlan.totalDays} days</strong></span>
                <span className="plan-stat">Work Hours: <strong>{migrationPlan.totalHours}h</strong></span>
                <span className="plan-stat">Phases: <strong>{migrationPlan.phases.length}</strong></span>
              </div>
              <button className="download-btn" onClick={downloadPlan}>Download Plan (JSON)</button>
            </div>

            <div className="phases-timeline">
              {migrationPlan.phases.map((phase, idx) => (
                <div key={idx} className="phase-card">
                  <div className="phase-header">
                    <span className="phase-number">{idx + 1}</span>
                    <h4>{phase.name}</h4>
                    <span className="phase-duration">{phase.durationDays} days</span>
                  </div>
                  <p className="phase-description">{phase.description}</p>
                  <div className="phase-tasks">
                    {phase.tasks.map((task, tidx) => (
                      <div key={tidx} className="task-item">
                        <span className={`task-type ${task.type}`}>{task.type}</span>
                        <span className="task-name">{task.name}</span>
                        <span className="task-hours">{task.estimatedHours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {migrationPlan.risks.length > 0 && (
              <div className="risks-section">
                <h4>Migration Risks</h4>
                <div className="risks-list">
                  {migrationPlan.risks.map((risk, idx) => (
                    <div key={idx} className={`risk-card risk-${risk.severity}`}>
                      <div className="risk-header">
                        <span className={`risk-badge ${risk.severity}`}>{risk.severity.toUpperCase()}</span>
                        <span className="risk-category">{risk.category}</span>
                      </div>
                      <p className="risk-description">{risk.description}</p>
                      <p className="risk-mitigation"><strong>Mitigation:</strong> {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {migrationPlan.dataTypeConversions.length > 0 && (
              <div className="conversions-section">
                <h4>Data Type Conversions</h4>
                <table className="conversions-table">
                  <thead>
                    <tr>
                      <th>Source Type</th>
                      <th>Target Type</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {migrationPlan.dataTypeConversions.map((conv, idx) => (
                      <tr key={idx} className={conv.potentialIssues ? 'has-issues' : ''}>
                        <td>{conv.sourceType}</td>
                        <td>{conv.targetType}</td>
                        <td>{conv.notes} {conv.potentialIssues && <span className="issue-flag">⚠️</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {migrationPlan.recommendations.length > 0 && (
              <div className="recommendations-section">
                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {migrationPlan.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ddl' && generatedDDL && (
          <div className="ddl-section">
            <div className="ddl-header">
              <h3>Generated {targetDatabase.toUpperCase()} DDL</h3>
              <button className="download-btn" onClick={downloadDDL}>Download SQL</button>
            </div>
            
            {conversionNotes.length > 0 && (
              <div className="conversion-notes">
                <h4>Conversion Notes</h4>
                <ul>
                  {conversionNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="ddl-code">{generatedDDL}</pre>
          </div>
        )}

        {activeTab === 'performance' && performanceSuggestions.length > 0 && (
          <div className="performance-section">
            <h3>Performance Optimization Suggestions for {targetDatabase.toUpperCase()}</h3>
            <div className="suggestions-grid">
              {performanceSuggestions.map((suggestion, idx) => (
                <div key={idx} className={`suggestion-card impact-${suggestion.impact}`}>
                  <div className="suggestion-header">
                    <span className={`category-badge ${suggestion.category}`}>{suggestion.category}</span>
                    <span className={`impact-badge ${suggestion.impact}`}>{suggestion.impact} impact</span>
                  </div>
                  <h4>{suggestion.title}</h4>
                  <p>{suggestion.description}</p>
                  <div className="implementation">
                    <strong>Implementation:</strong>
                    <code>{suggestion.implementation}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
