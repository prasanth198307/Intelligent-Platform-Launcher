import { db } from "./index.js";
import { sql } from "drizzle-orm";

interface TableColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  references?: string;
  notNull?: boolean;
  default?: string;
}

interface TableDefinition {
  name: string;
  columns: TableColumn[];
}

interface ModuleDefinition {
  name: string;
  tables: TableDefinition[];
}

const ALLOWED_TYPES = new Set([
  'serial', 'int', 'integer', 'bigint', 'smallint',
  'text', 'varchar', 'char',
  'boolean', 'bool',
  'timestamp', 'timestamptz', 'date', 'time',
  'decimal', 'numeric', 'real', 'float', 'double precision',
  'json', 'jsonb', 'uuid'
]);

function validateIdentifier(name: string): boolean {
  if (!name || name.length > 63) return false;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false;
  const reserved = ['select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'table', 'from', 'where'];
  if (reserved.includes(name.toLowerCase())) return false;
  return true;
}

function mapColumnType(type: string): string {
  const typeLower = type.toLowerCase().trim();
  const baseType = typeLower.split('(')[0];
  
  if (!ALLOWED_TYPES.has(baseType)) {
    console.warn(`Unknown type "${type}", defaulting to TEXT`);
    return 'TEXT';
  }
  
  if (typeLower === 'serial' || typeLower === 'int' || typeLower === 'integer') return 'INTEGER';
  if (typeLower.startsWith('varchar')) {
    const match = typeLower.match(/varchar\((\d+)\)/);
    return match ? `VARCHAR(${Math.min(parseInt(match[1]), 1000)})` : 'VARCHAR(255)';
  }
  if (typeLower === 'text') return 'TEXT';
  if (typeLower === 'boolean' || typeLower === 'bool') return 'BOOLEAN';
  if (typeLower === 'timestamp' || typeLower === 'timestamptz' || typeLower === 'datetime') return 'TIMESTAMP';
  if (typeLower === 'date') return 'DATE';
  if (typeLower === 'time') return 'TIME';
  if (typeLower.startsWith('decimal') || typeLower.startsWith('numeric')) {
    const match = typeLower.match(/\((\d+),(\d+)\)/);
    return match ? `DECIMAL(${Math.min(parseInt(match[1]), 38)},${Math.min(parseInt(match[2]), 10)})` : 'DECIMAL(10,2)';
  }
  if (typeLower === 'float' || typeLower === 'double' || typeLower === 'real') return 'REAL';
  if (typeLower === 'json' || typeLower === 'jsonb') return 'JSONB';
  if (typeLower === 'uuid') return 'UUID';
  return 'TEXT';
}

function sanitizeName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().substring(0, 63);
  if (!validateIdentifier(sanitized)) {
    return 'col_' + sanitized.replace(/^[^a-zA-Z_]/, '_');
  }
  return sanitized;
}

export function generateCreateTableSQL(projectId: string, table: TableDefinition): string {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  const tableName = `${schemaPrefix}_${sanitizeName(table.name)}`;
  
  const columnDefs = table.columns.map(col => {
    let def = `"${sanitizeName(col.name)}" ${mapColumnType(col.type)}`;
    
    if (col.primaryKey) {
      if (col.type.toLowerCase() === 'serial') {
        def = `"${sanitizeName(col.name)}" SERIAL PRIMARY KEY`;
      } else {
        def += ' PRIMARY KEY';
      }
    }
    
    if (col.notNull && !col.primaryKey) {
      def += ' NOT NULL';
    }
    
    if (col.default) {
      def += ` DEFAULT ${col.default}`;
    }
    
    return def;
  }).join(',\n  ');
  
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columnDefs}\n);`;
}

export function generateForeignKeySQL(projectId: string, table: TableDefinition): string[] {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  const tableName = `${schemaPrefix}_${sanitizeName(table.name)}`;
  
  const fkStatements: string[] = [];
  
  table.columns.forEach(col => {
    if (col.references) {
      const [refTable, refColumn] = col.references.split('.');
      const refTableName = `${schemaPrefix}_${sanitizeName(refTable)}`;
      const constraintName = `fk_${sanitizeName(table.name)}_${sanitizeName(col.name)}`;
      
      fkStatements.push(`
        DO $$ BEGIN
          ALTER TABLE "${tableName}" 
          ADD CONSTRAINT "${constraintName}" 
          FOREIGN KEY ("${sanitizeName(col.name)}") 
          REFERENCES "${refTableName}"("${sanitizeName(refColumn)}");
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
  });
  
  return fkStatements;
}

export async function provisionProjectDatabase(
  projectId: string, 
  modules: ModuleDefinition[]
): Promise<{ success: boolean; tables: string[]; errors: string[] }> {
  const createdTables: string[] = [];
  const errors: string[] = [];
  const allForeignKeys: string[] = [];
  
  console.log(`Provisioning database for project ${projectId}...`);
  
  for (const module of modules) {
    for (const table of module.tables || []) {
      try {
        const createSQL = generateCreateTableSQL(projectId, table);
        console.log(`Creating table: ${table.name}`);
        await db.execute(sql.raw(createSQL));
        createdTables.push(table.name);
        
        const fkStatements = generateForeignKeySQL(projectId, table);
        allForeignKeys.push(...fkStatements);
      } catch (e: any) {
        const errorMsg = `Failed to create table ${table.name}: ${e.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  }
  
  for (const fkSQL of allForeignKeys) {
    try {
      await db.execute(sql.raw(fkSQL));
    } catch (e: any) {
      console.error(`Failed to add foreign key: ${e.message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    tables: createdTables,
    errors
  };
}

export async function getProjectTables(projectId: string): Promise<string[]> {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE ${schemaPrefix + '_%'}
      ORDER BY table_name
    `);
    
    return (result.rows as any[]).map(row => row.table_name);
  } catch (e) {
    console.error('Failed to get project tables:', e);
    return [];
  }
}

export async function getTableData(
  projectId: string, 
  tableName: string, 
  limit: number = 100
): Promise<{ columns: string[]; rows: any[] }> {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  const fullTableName = `${schemaPrefix}_${sanitizeName(tableName)}`;
  
  try {
    const colResult = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${fullTableName}
      ORDER BY ordinal_position
    `);
    
    const columns = (colResult.rows as any[]).map(row => row.column_name);
    
    const dataResult = await db.execute(sql.raw(`SELECT * FROM "${fullTableName}" LIMIT ${limit}`));
    
    return {
      columns,
      rows: dataResult.rows as any[]
    };
  } catch (e) {
    console.error(`Failed to get table data for ${tableName}:`, e);
    return { columns: [], rows: [] };
  }
}

export async function dropProjectTables(projectId: string): Promise<{ success: boolean; dropped: string[] }> {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  const tables = await getProjectTables(projectId);
  const dropped: string[] = [];
  
  for (const table of tables) {
    try {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`));
      dropped.push(table);
    } catch (e: any) {
      console.error(`Failed to drop table ${table}:`, e.message);
    }
  }
  
  return { success: dropped.length === tables.length, dropped };
}

export async function insertSampleData(
  projectId: string,
  tableName: string,
  data: Record<string, any>[]
): Promise<{ success: boolean; inserted: number }> {
  const schemaPrefix = `ipl_${sanitizeName(projectId)}`;
  const fullTableName = `${schemaPrefix}_${sanitizeName(tableName)}`;
  
  let inserted = 0;
  
  for (const row of data) {
    try {
      const columns = Object.keys(row).map(k => `"${sanitizeName(k)}"`).join(', ');
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        return String(v);
      }).join(', ');
      
      await db.execute(sql.raw(`INSERT INTO "${fullTableName}" (${columns}) VALUES (${values})`));
      inserted++;
    } catch (e: any) {
      console.error(`Failed to insert row into ${tableName}:`, e.message);
    }
  }
  
  return { success: inserted === data.length, inserted };
}
