import { Pool } from 'pg';

interface NeonBranchResponse {
  branch: {
    id: string;
    project_id: string;
    parent_id: string;
    name: string;
    current_state: string;
    created_at: string;
  };
  endpoints: Array<{
    host: string;
    id: string;
    branch_id: string;
    type: string;
    current_state: string;
  }>;
  connection_uris?: Array<{
    connection_uri: string;
    connection_parameters: {
      host: string;
      database: string;
      role: string;
      password: string;
    };
  }>;
}

interface ProjectDatabaseConfig {
  branchId: string;
  branchName: string;
  endpointHost: string;
  connectionString: string;
  createdAt: string;
}

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

function getNeonConfig() {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const dbName = process.env.NEON_DATABASE_NAME || 'neondb';
  const dbRole = process.env.NEON_ROLE_NAME || process.env.PGUSER || 'neondb_owner';
  const dbPassword = process.env.NEON_ROLE_PASSWORD || process.env.PGPASSWORD;
  
  if (!apiKey || !projectId) {
    return null;
  }
  
  return { apiKey, projectId, dbName, dbRole, dbPassword };
}

export async function createProjectBranch(projectId: string, projectName: string): Promise<ProjectDatabaseConfig | null> {
  const config = getNeonConfig();
  
  if (!config) {
    console.log('[Neon] API key or project ID not configured, using shared database with prefixing');
    return null;
  }
  
  try {
    const branchName = `ipl-${projectId.substring(0, 20)}`;
    
    const response = await fetch(`${NEON_API_BASE}/projects/${config.projectId}/branches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        endpoints: [{ type: 'read_write' }],
        branch: {
          name: branchName,
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Neon] Failed to create branch:', response.status, errorText);
      return null;
    }
    
    const data: NeonBranchResponse = await response.json();
    
    const endpoint = data.endpoints[0];
    if (!endpoint) {
      console.error('[Neon] No endpoint returned for branch');
      return null;
    }
    
    const connectionString = `postgresql://${config.dbRole}:${config.dbPassword}@${endpoint.host}/${config.dbName}?sslmode=require`;
    
    console.log(`[Neon] Created branch "${branchName}" for project ${projectId}`);
    console.log(`[Neon] Branch ID: ${data.branch.id}, Endpoint: ${endpoint.host}`);
    
    return {
      branchId: data.branch.id,
      branchName: branchName,
      endpointHost: endpoint.host,
      connectionString,
      createdAt: data.branch.created_at
    };
  } catch (e: any) {
    console.error('[Neon] Error creating branch:', e?.message || e);
    return null;
  }
}

export async function deleteProjectBranch(branchId: string): Promise<boolean> {
  const config = getNeonConfig();
  
  if (!config) {
    console.log('[Neon] API key not configured, cannot delete branch');
    return false;
  }
  
  try {
    const response = await fetch(`${NEON_API_BASE}/projects/${config.projectId}/branches/${branchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Neon] Failed to delete branch:', response.status, errorText);
      return false;
    }
    
    console.log(`[Neon] Deleted branch ${branchId}`);
    return true;
  } catch (e: any) {
    console.error('[Neon] Error deleting branch:', e?.message || e);
    return false;
  }
}

export async function listProjectBranches(): Promise<any[]> {
  const config = getNeonConfig();
  
  if (!config) {
    return [];
  }
  
  try {
    const response = await fetch(`${NEON_API_BASE}/projects/${config.projectId}/branches`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.branches || [];
  } catch (e) {
    return [];
  }
}

const projectPools = new Map<string, Pool>();

export function getProjectPool(connectionString: string): Pool {
  let pool = projectPools.get(connectionString);
  
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    projectPools.set(connectionString, pool);
  }
  
  return pool;
}

export async function executeOnProjectBranch(connectionString: string, query: string): Promise<{ rows: any[]; rowCount: number }> {
  const pool = getProjectPool(connectionString);
  
  try {
    const result = await pool.query(query);
    return {
      rows: result.rows,
      rowCount: result.rowCount || result.rows.length
    };
  } catch (e: any) {
    throw new Error(`Query failed: ${e.message}`);
  }
}

export async function getProjectBranchTables(connectionString: string): Promise<Array<{ name: string; columns: string[]; rowCount: number }>> {
  const pool = getProjectPool(connectionString);
  
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables: Array<{ name: string; columns: string[]; rowCount: number }> = [];
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      const colResult = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = $1 ORDER BY ordinal_position
      `, [tableName]);
      const columns = colResult.rows.map(r => r.column_name);
      
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const rowCount = parseInt(countResult.rows[0]?.count || '0');
      
      tables.push({ name: tableName, columns, rowCount });
    }
    
    return tables;
  } catch (e: any) {
    console.error('[Neon] Error getting tables:', e.message);
    return [];
  }
}

export function isNeonConfigured(): boolean {
  return getNeonConfig() !== null;
}
