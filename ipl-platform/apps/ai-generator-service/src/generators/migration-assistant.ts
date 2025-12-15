export interface SourceSchema {
  tables: TableSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
  partitions: PartitionSchema[];
  views: ViewSchema[];
  procedures: ProcedureSchema[];
  triggers: TriggerSchema[];
}

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  rowCount: number;
  sizeBytes: number;
  lastModified?: string;
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface IndexSchema {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  isClustered: boolean;
  type: string;
}

export interface ConstraintSchema {
  name: string;
  tableName: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'DEFAULT';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface PartitionSchema {
  tableName: string;
  partitionColumn: string;
  partitionType: 'RANGE' | 'LIST' | 'HASH';
  partitions: { name: string; value: string }[];
}

export interface ViewSchema {
  name: string;
  definition: string;
}

export interface ProcedureSchema {
  name: string;
  type: 'PROCEDURE' | 'FUNCTION';
  definition: string;
}

export interface TriggerSchema {
  name: string;
  tableName: string;
  event: string;
  timing: string;
  definition: string;
}

export interface MigrationConfig {
  sourceDatabase: 'mssql' | 'mysql' | 'oracle' | 'postgresql' | 'mongodb';
  targetDatabase: 'postgresql' | 'mysql' | 'mssql' | 'oracle' | 'mongodb';
  sourceSchema: SourceSchema;
  options: {
    preserveIndexes: boolean;
    convertProcedures: boolean;
    preservePartitions: boolean;
    parallelTables: number;
    batchSize: number;
  };
}

export interface MigrationPlan {
  phases: MigrationPhase[];
  totalDays: number;
  totalHours: number;
  risks: MigrationRisk[];
  recommendations: string[];
  dataTypeConversions: DataTypeConversion[];
}

export interface MigrationPhase {
  name: string;
  description: string;
  durationDays: number;
  durationHours: number;
  tasks: MigrationTask[];
  dependencies: string[];
}

export interface MigrationTask {
  name: string;
  description: string;
  type: 'schema' | 'data' | 'validation' | 'cutover';
  estimatedHours: number;
  tables?: string[];
  script?: string;
}

export interface MigrationRisk {
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  mitigation: string;
}

export interface DataTypeConversion {
  sourceType: string;
  targetType: string;
  notes: string;
  potentialIssues?: string;
}

export interface PerformanceSuggestion {
  category: 'indexing' | 'partitioning' | 'query' | 'storage' | 'configuration';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
}

const DATA_TYPE_MAPPINGS: Record<string, Record<string, { type: string; notes: string }>> = {
  'mssql-postgresql': {
    'int': { type: 'INTEGER', notes: 'Direct mapping' },
    'bigint': { type: 'BIGINT', notes: 'Direct mapping' },
    'smallint': { type: 'SMALLINT', notes: 'Direct mapping' },
    'tinyint': { type: 'SMALLINT', notes: 'PostgreSQL has no TINYINT, use SMALLINT' },
    'bit': { type: 'BOOLEAN', notes: 'BIT(1) maps to BOOLEAN' },
    'decimal': { type: 'DECIMAL', notes: 'Preserve precision and scale' },
    'numeric': { type: 'NUMERIC', notes: 'Direct mapping' },
    'money': { type: 'DECIMAL(19,4)', notes: 'Use DECIMAL for money types' },
    'smallmoney': { type: 'DECIMAL(10,4)', notes: 'Use DECIMAL for money types' },
    'float': { type: 'DOUBLE PRECISION', notes: 'Direct mapping' },
    'real': { type: 'REAL', notes: 'Direct mapping' },
    'datetime': { type: 'TIMESTAMP', notes: 'DATETIME maps to TIMESTAMP' },
    'datetime2': { type: 'TIMESTAMP', notes: 'DATETIME2 maps to TIMESTAMP with microseconds' },
    'smalldatetime': { type: 'TIMESTAMP', notes: 'Use TIMESTAMP' },
    'date': { type: 'DATE', notes: 'Direct mapping' },
    'time': { type: 'TIME', notes: 'Direct mapping' },
    'datetimeoffset': { type: 'TIMESTAMPTZ', notes: 'Use TIMESTAMPTZ for timezone support' },
    'char': { type: 'CHAR', notes: 'Direct mapping' },
    'varchar': { type: 'VARCHAR', notes: 'VARCHAR(MAX) becomes TEXT' },
    'nchar': { type: 'CHAR', notes: 'PostgreSQL uses UTF-8, no separate N types' },
    'nvarchar': { type: 'VARCHAR', notes: 'NVARCHAR(MAX) becomes TEXT' },
    'text': { type: 'TEXT', notes: 'Direct mapping' },
    'ntext': { type: 'TEXT', notes: 'PostgreSQL uses UTF-8' },
    'binary': { type: 'BYTEA', notes: 'Use BYTEA for binary data' },
    'varbinary': { type: 'BYTEA', notes: 'VARBINARY(MAX) maps to BYTEA' },
    'image': { type: 'BYTEA', notes: 'Deprecated in MSSQL, use BYTEA' },
    'uniqueidentifier': { type: 'UUID', notes: 'Direct mapping' },
    'xml': { type: 'XML', notes: 'Direct mapping' },
    'json': { type: 'JSONB', notes: 'Use JSONB for better performance' },
    'geography': { type: 'GEOGRAPHY', notes: 'Requires PostGIS extension' },
    'geometry': { type: 'GEOMETRY', notes: 'Requires PostGIS extension' },
    'hierarchyid': { type: 'LTREE', notes: 'Requires ltree extension' },
    'sql_variant': { type: 'TEXT', notes: 'No direct equivalent, consider JSONB' },
    'timestamp': { type: 'BYTEA', notes: 'MSSQL timestamp is rowversion, not datetime' },
    'rowversion': { type: 'BYTEA', notes: 'No direct equivalent' },
  },
  'mysql-postgresql': {
    'tinyint': { type: 'SMALLINT', notes: 'PostgreSQL has no TINYINT' },
    'int': { type: 'INTEGER', notes: 'Direct mapping' },
    'bigint': { type: 'BIGINT', notes: 'Direct mapping' },
    'float': { type: 'REAL', notes: 'Direct mapping' },
    'double': { type: 'DOUBLE PRECISION', notes: 'Direct mapping' },
    'decimal': { type: 'DECIMAL', notes: 'Direct mapping' },
    'datetime': { type: 'TIMESTAMP', notes: 'Direct mapping' },
    'timestamp': { type: 'TIMESTAMPTZ', notes: 'MySQL TIMESTAMP is timezone-aware' },
    'enum': { type: 'VARCHAR', notes: 'Create CHECK constraint or use enum type' },
    'set': { type: 'TEXT[]', notes: 'Use array type' },
    'json': { type: 'JSONB', notes: 'Use JSONB for better performance' },
    'blob': { type: 'BYTEA', notes: 'Direct mapping' },
    'longblob': { type: 'BYTEA', notes: 'Direct mapping' },
    'mediumblob': { type: 'BYTEA', notes: 'Direct mapping' },
    'tinyblob': { type: 'BYTEA', notes: 'Direct mapping' },
  },
  'oracle-postgresql': {
    'number': { type: 'NUMERIC', notes: 'Preserve precision and scale' },
    'varchar2': { type: 'VARCHAR', notes: 'Direct mapping' },
    'nvarchar2': { type: 'VARCHAR', notes: 'PostgreSQL uses UTF-8' },
    'clob': { type: 'TEXT', notes: 'Direct mapping' },
    'nclob': { type: 'TEXT', notes: 'PostgreSQL uses UTF-8' },
    'blob': { type: 'BYTEA', notes: 'Direct mapping' },
    'raw': { type: 'BYTEA', notes: 'Direct mapping' },
    'long raw': { type: 'BYTEA', notes: 'Direct mapping' },
    'date': { type: 'TIMESTAMP', notes: 'Oracle DATE includes time' },
    'timestamp': { type: 'TIMESTAMP', notes: 'Direct mapping' },
    'timestamp with time zone': { type: 'TIMESTAMPTZ', notes: 'Direct mapping' },
    'interval year to month': { type: 'INTERVAL', notes: 'Direct mapping' },
    'interval day to second': { type: 'INTERVAL', notes: 'Direct mapping' },
    'bfile': { type: 'TEXT', notes: 'Store path, handle externally' },
    'rowid': { type: 'TEXT', notes: 'No direct equivalent' },
    'urowid': { type: 'TEXT', notes: 'No direct equivalent' },
    'xmltype': { type: 'XML', notes: 'Direct mapping' },
    'sdo_geometry': { type: 'GEOMETRY', notes: 'Requires PostGIS extension' },
  },
};

export function analyzeSchema(schema: SourceSchema): {
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
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  estimatedMigrationDays: number;
} {
  const totalRows = schema.tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalSizeBytes = schema.tables.reduce((sum, t) => sum + t.sizeBytes, 0);
  const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);

  const summary = {
    totalTables: schema.tables.length,
    totalRows,
    totalSizeGB: Math.round(totalSizeGB * 100) / 100,
    totalIndexes: schema.indexes.length,
    totalConstraints: schema.constraints.length,
    totalPartitions: schema.partitions.length,
    totalViews: schema.views.length,
    totalProcedures: schema.procedures.length,
    totalTriggers: schema.triggers.length,
  };

  let complexityScore = 0;
  if (summary.totalTables > 100) complexityScore += 2;
  else if (summary.totalTables > 50) complexityScore += 1;
  
  if (totalSizeGB > 500) complexityScore += 3;
  else if (totalSizeGB > 100) complexityScore += 2;
  else if (totalSizeGB > 10) complexityScore += 1;
  
  if (summary.totalProcedures > 50) complexityScore += 2;
  else if (summary.totalProcedures > 20) complexityScore += 1;
  
  if (summary.totalPartitions > 10) complexityScore += 1;
  if (summary.totalTriggers > 20) complexityScore += 1;

  const complexity = complexityScore >= 6 ? 'very-high' :
                    complexityScore >= 4 ? 'high' :
                    complexityScore >= 2 ? 'medium' : 'low';

  const baseDays = {
    'low': 3,
    'medium': 7,
    'high': 14,
    'very-high': 30,
  }[complexity];

  const sizeFactor = Math.max(1, Math.ceil(totalSizeGB / 100));
  const tableFactor = Math.max(1, Math.ceil(summary.totalTables / 50));
  
  const estimatedMigrationDays = Math.ceil(baseDays * Math.max(sizeFactor, tableFactor));

  return { summary, complexity, estimatedMigrationDays };
}

export function generateMigrationPlan(config: MigrationConfig): MigrationPlan {
  const analysis = analyzeSchema(config.sourceSchema);
  const mappingKey = `${config.sourceDatabase}-${config.targetDatabase}`;
  const typeMapping = DATA_TYPE_MAPPINGS[mappingKey] || {};

  const dataTypeConversions: DataTypeConversion[] = [];
  const uniqueTypes = new Set<string>();
  
  for (const table of config.sourceSchema.tables) {
    for (const col of table.columns) {
      const baseType = col.dataType.toLowerCase().split('(')[0];
      if (!uniqueTypes.has(baseType)) {
        uniqueTypes.add(baseType);
        const mapping = typeMapping[baseType];
        if (mapping) {
          dataTypeConversions.push({
            sourceType: col.dataType,
            targetType: mapping.type,
            notes: mapping.notes,
          });
        } else {
          dataTypeConversions.push({
            sourceType: col.dataType,
            targetType: col.dataType,
            notes: 'No mapping found, manual review required',
            potentialIssues: 'May require custom conversion logic',
          });
        }
      }
    }
  }

  const phases: MigrationPhase[] = [];

  phases.push({
    name: 'Phase 1: Assessment & Planning',
    description: 'Complete schema analysis, identify risks, and create detailed migration plan',
    durationDays: Math.max(2, Math.ceil(analysis.estimatedMigrationDays * 0.15)),
    durationHours: 0,
    tasks: [
      { name: 'Schema Analysis', description: 'Document all tables, indexes, constraints, and relationships', type: 'schema', estimatedHours: 8 },
      { name: 'Data Profiling', description: 'Analyze data volumes, patterns, and quality issues', type: 'validation', estimatedHours: 8 },
      { name: 'Dependency Mapping', description: 'Map stored procedures, triggers, and application dependencies', type: 'schema', estimatedHours: 4 },
      { name: 'Risk Assessment', description: 'Identify and document migration risks', type: 'validation', estimatedHours: 4 },
    ],
    dependencies: [],
  });

  phases.push({
    name: 'Phase 2: Target Environment Setup',
    description: `Set up ${config.targetDatabase} environment with optimized configuration`,
    durationDays: Math.max(1, Math.ceil(analysis.estimatedMigrationDays * 0.1)),
    durationHours: 0,
    tasks: [
      { name: 'Database Provisioning', description: `Create ${config.targetDatabase} instance with appropriate sizing`, type: 'schema', estimatedHours: 4 },
      { name: 'Performance Tuning', description: 'Configure memory, connections, and storage settings', type: 'schema', estimatedHours: 4 },
      { name: 'Security Setup', description: 'Configure users, roles, and access controls', type: 'schema', estimatedHours: 4 },
    ],
    dependencies: ['Phase 1: Assessment & Planning'],
  });

  phases.push({
    name: 'Phase 3: Schema Migration',
    description: 'Convert and deploy database schema to target environment',
    durationDays: Math.max(2, Math.ceil(analysis.estimatedMigrationDays * 0.2)),
    durationHours: 0,
    tasks: [
      { name: 'DDL Conversion', description: 'Convert table definitions with proper data types', type: 'schema', estimatedHours: 8, tables: config.sourceSchema.tables.map(t => t.name) },
      { name: 'Index Creation', description: 'Create indexes with optimized settings', type: 'schema', estimatedHours: 4 },
      { name: 'Constraint Migration', description: 'Migrate primary keys, foreign keys, and check constraints', type: 'schema', estimatedHours: 4 },
      { name: 'Partition Setup', description: 'Configure table partitioning if applicable', type: 'schema', estimatedHours: config.sourceSchema.partitions.length > 0 ? 8 : 0 },
    ],
    dependencies: ['Phase 2: Target Environment Setup'],
  });

  phases.push({
    name: 'Phase 4: Data Migration',
    description: 'Extract, transform, and load data to target database',
    durationDays: Math.max(3, Math.ceil(analysis.estimatedMigrationDays * 0.35)),
    durationHours: 0,
    tasks: [
      { name: 'Initial Data Load', description: `Migrate ${analysis.summary.totalRows.toLocaleString()} rows across ${analysis.summary.totalTables} tables`, type: 'data', estimatedHours: Math.max(8, analysis.summary.totalSizeGB * 2), tables: config.sourceSchema.tables.map(t => t.name) },
      { name: 'Data Transformation', description: 'Apply necessary data type conversions', type: 'data', estimatedHours: 8 },
      { name: 'Incremental Sync', description: 'Set up CDC for ongoing changes during migration', type: 'data', estimatedHours: 8 },
    ],
    dependencies: ['Phase 3: Schema Migration'],
  });

  phases.push({
    name: 'Phase 5: Validation & Testing',
    description: 'Verify data integrity and application compatibility',
    durationDays: Math.max(2, Math.ceil(analysis.estimatedMigrationDays * 0.15)),
    durationHours: 0,
    tasks: [
      { name: 'Row Count Validation', description: 'Verify record counts match between source and target', type: 'validation', estimatedHours: 4 },
      { name: 'Data Checksum', description: 'Compare checksums for critical tables', type: 'validation', estimatedHours: 4 },
      { name: 'Application Testing', description: 'Test application queries against new database', type: 'validation', estimatedHours: 16 },
      { name: 'Performance Testing', description: 'Benchmark query performance and identify bottlenecks', type: 'validation', estimatedHours: 8 },
    ],
    dependencies: ['Phase 4: Data Migration'],
  });

  phases.push({
    name: 'Phase 6: Cutover & Go-Live',
    description: 'Final sync, application switchover, and monitoring',
    durationDays: Math.max(1, Math.ceil(analysis.estimatedMigrationDays * 0.05)),
    durationHours: 0,
    tasks: [
      { name: 'Final Sync', description: 'Apply remaining incremental changes', type: 'cutover', estimatedHours: 2 },
      { name: 'Application Switchover', description: 'Update connection strings and redirect traffic', type: 'cutover', estimatedHours: 1 },
      { name: 'Monitoring Setup', description: 'Configure alerts and dashboards for new database', type: 'cutover', estimatedHours: 2 },
      { name: 'Rollback Preparation', description: 'Ensure rollback procedures are ready', type: 'cutover', estimatedHours: 1 },
    ],
    dependencies: ['Phase 5: Validation & Testing'],
  });

  const risks: MigrationRisk[] = [];

  if (config.sourceSchema.procedures.length > 0) {
    risks.push({
      severity: 'high',
      category: 'Code Conversion',
      description: `${config.sourceSchema.procedures.length} stored procedures require manual conversion`,
      mitigation: 'Plan for manual T-SQL to PL/pgSQL conversion and thorough testing',
    });
  }

  if (analysis.summary.totalSizeGB > 100) {
    risks.push({
      severity: 'high',
      category: 'Data Volume',
      description: `Large database size (${analysis.summary.totalSizeGB} GB) may require extended downtime`,
      mitigation: 'Use CDC for incremental sync to minimize cutover window',
    });
  }

  if (config.sourceSchema.partitions.length > 0) {
    risks.push({
      severity: 'medium',
      category: 'Partitioning',
      description: 'Partition strategies differ between databases',
      mitigation: 'Review and redesign partition scheme for target database',
    });
  }

  if (config.sourceSchema.triggers.length > 0) {
    risks.push({
      severity: 'medium',
      category: 'Triggers',
      description: `${config.sourceSchema.triggers.length} triggers require conversion`,
      mitigation: 'Convert triggers to target database syntax and test behavior',
    });
  }

  risks.push({
    severity: 'low',
    category: 'Data Types',
    description: 'Some data types may require precision adjustments',
    mitigation: 'Review data type mappings and test edge cases',
  });

  const recommendations = [
    'Create comprehensive backup before starting migration',
    'Use staging environment to test full migration before production',
    'Implement row-level validation for critical business data',
    'Document all custom conversions and transformations',
    'Plan maintenance window during low-traffic periods',
    `Consider ${config.targetDatabase} connection pooling for optimal performance`,
    'Set up monitoring and alerting before cutover',
    'Keep source database available for rollback for at least 2 weeks post-migration',
  ];

  const totalDays = phases.reduce((sum, p) => sum + p.durationDays, 0);
  const totalHours = phases.reduce((sum, p) => sum + p.tasks.reduce((ts, t) => ts + t.estimatedHours, 0), 0);

  return {
    phases,
    totalDays,
    totalHours,
    risks,
    recommendations,
    dataTypeConversions,
  };
}

export function generateTargetDDL(
  sourceSchema: SourceSchema,
  sourceDb: string,
  targetDb: string
): { ddl: string; conversionNotes: string[] } {
  const mappingKey = `${sourceDb}-${targetDb}`;
  const typeMapping = DATA_TYPE_MAPPINGS[mappingKey] || {};
  const conversionNotes: string[] = [];
  let ddl = `-- Generated DDL for ${targetDb}\n-- Source: ${sourceDb}\n-- Generated: ${new Date().toISOString()}\n\n`;

  for (const table of sourceSchema.tables) {
    ddl += `-- Table: ${table.name} (${table.rowCount.toLocaleString()} rows, ${(table.sizeBytes / 1024 / 1024).toFixed(2)} MB)\n`;
    ddl += `CREATE TABLE ${table.name} (\n`;
    
    const columnDefs: string[] = [];
    for (const col of table.columns) {
      const baseType = col.dataType.toLowerCase().split('(')[0];
      const mapping = typeMapping[baseType];
      let targetType = col.dataType;
      
      if (mapping) {
        targetType = mapping.type;
        if (col.length && !['TEXT', 'BYTEA', 'BOOLEAN', 'UUID'].includes(mapping.type)) {
          targetType = `${mapping.type}(${col.length})`;
        }
        if (col.precision && col.scale) {
          targetType = `${mapping.type}(${col.precision}, ${col.scale})`;
        }
      } else {
        conversionNotes.push(`Column ${table.name}.${col.name}: No mapping for ${col.dataType}, review required`);
      }

      let colDef = `  ${col.name} ${targetType}`;
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.defaultValue && !col.isAutoIncrement) {
        colDef += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.isAutoIncrement && targetDb === 'postgresql') {
        colDef = `  ${col.name} SERIAL`;
        if (!col.nullable) colDef += ' NOT NULL';
      }
      columnDefs.push(colDef);
    }

    const pkColumns = table.columns.filter(c => c.isPrimaryKey).map(c => c.name);
    if (pkColumns.length > 0) {
      columnDefs.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
    }

    ddl += columnDefs.join(',\n');
    ddl += '\n);\n\n';
  }

  for (const idx of sourceSchema.indexes) {
    const uniqueKeyword = idx.isUnique ? 'UNIQUE ' : '';
    ddl += `CREATE ${uniqueKeyword}INDEX ${idx.name} ON ${idx.tableName} (${idx.columns.join(', ')});\n`;
  }
  ddl += '\n';

  const foreignKeys = sourceSchema.constraints.filter(c => c.type === 'FOREIGN KEY');
  for (const fk of foreignKeys) {
    ddl += `ALTER TABLE ${fk.tableName} ADD CONSTRAINT ${fk.name} `;
    ddl += `FOREIGN KEY (${fk.columns.join(', ')}) `;
    ddl += `REFERENCES ${fk.referencedTable} (${fk.referencedColumns?.join(', ')});\n`;
  }

  return { ddl, conversionNotes };
}

export function generatePerformanceSuggestions(
  schema: SourceSchema,
  targetDb: string
): PerformanceSuggestion[] {
  const suggestions: PerformanceSuggestion[] = [];

  const largeTables = schema.tables.filter(t => t.rowCount > 1000000);
  for (const table of largeTables) {
    suggestions.push({
      category: 'partitioning',
      title: `Consider partitioning ${table.name}`,
      description: `Table has ${table.rowCount.toLocaleString()} rows. Partitioning can improve query performance and maintenance.`,
      impact: 'high',
      implementation: targetDb === 'postgresql' 
        ? `Use PARTITION BY RANGE on a date column or PARTITION BY HASH for even distribution`
        : `Create partitions based on your access patterns`,
    });
  }

  const tablesWithoutIndexes = schema.tables.filter(
    t => !schema.indexes.some(i => i.tableName === t.name) && t.rowCount > 10000
  );
  for (const table of tablesWithoutIndexes) {
    suggestions.push({
      category: 'indexing',
      title: `Add indexes to ${table.name}`,
      description: `Table has ${table.rowCount.toLocaleString()} rows but no indexes. Queries may perform full table scans.`,
      impact: 'high',
      implementation: `Analyze query patterns and add indexes on frequently filtered/joined columns`,
    });
  }

  const foreignKeys = schema.constraints.filter(c => c.type === 'FOREIGN KEY');
  for (const fk of foreignKeys) {
    const hasIndex = schema.indexes.some(
      i => i.tableName === fk.tableName && i.columns.includes(fk.columns[0])
    );
    if (!hasIndex) {
      suggestions.push({
        category: 'indexing',
        title: `Add index for foreign key on ${fk.tableName}`,
        description: `Foreign key ${fk.name} has no supporting index, which can slow JOIN operations.`,
        impact: 'medium',
        implementation: `CREATE INDEX idx_${fk.tableName}_${fk.columns[0]} ON ${fk.tableName} (${fk.columns.join(', ')});`,
      });
    }
  }

  if (targetDb === 'postgresql') {
    suggestions.push({
      category: 'configuration',
      title: 'Optimize PostgreSQL settings',
      description: 'Configure PostgreSQL for optimal performance based on your workload.',
      impact: 'high',
      implementation: `Set shared_buffers to 25% of RAM, effective_cache_size to 75% of RAM, work_mem based on concurrent connections`,
    });

    suggestions.push({
      category: 'query',
      title: 'Use JSONB for flexible data',
      description: 'Consider JSONB columns for semi-structured data with GIN indexes for fast queries.',
      impact: 'medium',
      implementation: `CREATE INDEX idx_jsonb_data ON table USING GIN (jsonb_column);`,
    });
  }

  suggestions.push({
    category: 'storage',
    title: 'Enable compression',
    description: 'Use table compression to reduce storage and improve I/O performance.',
    impact: 'medium',
    implementation: targetDb === 'postgresql'
      ? `Use pg_lz or external compression tools for TOAST data`
      : `Enable table compression based on database capabilities`,
  });

  return suggestions;
}
