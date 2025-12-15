import type { GenerationContext } from "../index.js";

export interface CodeGenerationRequest {
  context: GenerationContext;
  modules?: { name: string; description: string }[];
  screens?: { name: string; type: string }[];
  tables?: { name: string; columns: { name: string; type: string }[] }[];
  framework?: string;
  language?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

export async function mockGenerateApplicationCode(request: CodeGenerationRequest): Promise<{ files: GeneratedFile[] }> {
  const { context, framework = "react", language = "typescript" } = request;
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  const files: GeneratedFile[] = [
    {
      path: "src/index.tsx",
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      language: "typescript",
      description: "Application entry point"
    },
    {
      path: "src/App.tsx",
      content: `import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <Dashboard domain="${context.domain}" />
      </main>
    </div>
  );
}`,
      language: "typescript",
      description: "Main application component"
    },
    {
      path: "src/components/Dashboard.tsx",
      content: `import React, { useState, useEffect } from 'react';
import { fetchData } from '../api/client';

interface DashboardProps {
  domain: string;
}

export function Dashboard({ domain }: DashboardProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData('/api/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>{domain.toUpperCase()} Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Records</h3>
          <p className="stat-value">{data.length || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Active Today</h3>
          <p className="stat-value">{Math.floor((data.length || 0) * 0.7)}</p>
        </div>
      </div>
    </div>
  );
}`,
      language: "typescript",
      description: "Dashboard component with data fetching"
    },
    {
      path: "src/api/client.ts",
      content: `const API_BASE = process.env.VITE_API_URL || '';

export async function fetchData<T>(endpoint: string): Promise<T> {
  const response = await fetch(\`\${API_BASE}\${endpoint}\`);
  if (!response.ok) {
    throw new Error(\`API Error: \${response.statusText}\`);
  }
  return response.json();
}

export async function postData<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(\`API Error: \${response.statusText}\`);
  }
  return response.json();
}`,
      language: "typescript",
      description: "API client utilities"
    },
    {
      path: "src/db/schema.ts",
      content: `import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id),
  type: varchar('type', { length: 100 }),
  amount: integer('amount'),
  processed: boolean('processed').default(false),
  createdAt: timestamp('created_at').defaultNow()
});`,
      language: "typescript",
      description: "Database schema using Drizzle ORM"
    },
    {
      path: "src/server/routes.ts",
      content: `import express from 'express';
import { db } from './db';
import { entities, transactions } from '../db/schema';

const router = express.Router();

router.get('/api/dashboard', async (req, res) => {
  try {
    const data = await db.select().from(entities).limit(100);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.get('/api/entities', async (req, res) => {
  try {
    const data = await db.select().from(entities);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

router.post('/api/entities', async (req, res) => {
  try {
    const [entity] = await db.insert(entities).values(req.body).returning();
    res.json(entity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

export default router;`,
      language: "typescript",
      description: "Express API routes"
    }
  ];

  return { files };
}

export async function mockReviewCode(code: string, language: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const lines = code.split('\n').length;
  const hasConsoleLog = code.includes('console.log');
  const hasAny = code.includes(': any');
  const hasTryCatch = code.includes('try {');

  const issues: any[] = [];
  
  if (hasConsoleLog) {
    issues.push({
      severity: "warning",
      line: code.split('\n').findIndex(l => l.includes('console.log')) + 1,
      message: "Remove console.log statements before production",
      suggestion: "Use a proper logging library like winston or pino"
    });
  }

  if (hasAny) {
    issues.push({
      severity: "warning",
      line: code.split('\n').findIndex(l => l.includes(': any')) + 1,
      message: "Avoid using 'any' type",
      suggestion: "Define proper TypeScript interfaces"
    });
  }

  if (!hasTryCatch && code.includes('await ')) {
    issues.push({
      severity: "error",
      message: "Async operations should have error handling",
      suggestion: "Wrap async calls in try-catch blocks"
    });
  }

  const score = Math.max(50, 100 - (issues.filter(i => i.severity === 'error').length * 20) - (issues.filter(i => i.severity === 'warning').length * 10));

  return {
    score,
    issues,
    summary: `Code analysis complete. Found ${issues.length} issue(s) in ${lines} lines of ${language} code.`,
    improvements: [
      "Add comprehensive error handling",
      "Include input validation",
      "Add JSDoc comments for public functions",
      "Consider adding unit tests"
    ]
  };
}

export async function mockFixCode(code: string, issues: string[]): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 600));

  let fixedCode = code;
  const changes: { line: number; description: string }[] = [];

  if (issues.some(i => i.toLowerCase().includes('console'))) {
    fixedCode = fixedCode.replace(/console\.log\([^)]*\);?\n?/g, '');
    changes.push({ line: 0, description: "Removed console.log statements" });
  }

  if (issues.some(i => i.toLowerCase().includes('any'))) {
    fixedCode = fixedCode.replace(/: any/g, ': unknown');
    changes.push({ line: 0, description: "Replaced 'any' with 'unknown' type" });
  }

  return {
    originalCode: code,
    fixedCode,
    changes,
    summary: `Applied ${changes.length} fix(es) based on ${issues.length} reported issue(s).`
  };
}

export async function mockExplainCode(code: string, language: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const isReact = code.includes('React') || code.includes('useState');
  const isAsync = code.includes('async ') || code.includes('await ');
  const hasTypes = code.includes(': ') || code.includes('interface ');

  const concepts: string[] = [];
  if (isReact) concepts.push("React Components", "JSX Syntax");
  if (isAsync) concepts.push("Async/Await", "Promises");
  if (hasTypes) concepts.push("TypeScript Types", "Type Safety");
  if (code.includes('export')) concepts.push("ES6 Modules");
  if (code.includes('useState')) concepts.push("React Hooks");

  return {
    explanation: `This ${language} code ${isReact ? 'defines a React component' : 'implements application logic'}. It uses ${concepts.slice(0, 3).join(', ')} ${concepts.length > 3 ? 'and more' : ''}.`,
    concepts: concepts.length > 0 ? concepts : ["Basic Programming", "Functions", "Variables"]
  };
}
