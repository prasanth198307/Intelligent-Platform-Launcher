import fs from "fs/promises";
import path from "path";

export interface ModuleDefinition {
  name: string;
  description: string;
  status: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      primaryKey?: boolean;
      references?: string;
      nullable?: boolean;
      unique?: boolean;
    }>;
  }>;
  apis: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  screens: Array<{
    name: string;
    type: string;
    route: string;
  }>;
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
  domain: string;
  database: string;
  modules: ModuleDefinition[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: "backend" | "frontend" | "database" | "config";
}

export interface MaterializedProject {
  projectDir: string;
  files: GeneratedFile[];
  commands: {
    install: string;
    migrate: string;
    start: string;
  };
}

const PROJECTS_DIR = "/tmp/ipl-projects";

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function mapColumnType(type: string): { tsType: string; sqlType: string; drizzleType: string } {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes("serial")) {
    return { tsType: "number", sqlType: "SERIAL", drizzleType: "serial" };
  }
  if (typeLower.includes("uuid")) {
    return { tsType: "string", sqlType: "UUID", drizzleType: "uuid" };
  }
  if (typeLower.includes("int") || typeLower.includes("integer")) {
    return { tsType: "number", sqlType: "INTEGER", drizzleType: "integer" };
  }
  if (typeLower.includes("bigint")) {
    return { tsType: "number", sqlType: "BIGINT", drizzleType: "bigint" };
  }
  if (typeLower.includes("decimal") || typeLower.includes("numeric")) {
    return { tsType: "number", sqlType: "DECIMAL(10,2)", drizzleType: "decimal" };
  }
  if (typeLower.includes("float") || typeLower.includes("double") || typeLower.includes("real")) {
    return { tsType: "number", sqlType: "REAL", drizzleType: "real" };
  }
  if (typeLower.includes("bool")) {
    return { tsType: "boolean", sqlType: "BOOLEAN", drizzleType: "boolean" };
  }
  if (typeLower.includes("timestamp") || typeLower.includes("datetime")) {
    return { tsType: "Date", sqlType: "TIMESTAMP", drizzleType: "timestamp" };
  }
  if (typeLower.includes("date")) {
    return { tsType: "string", sqlType: "DATE", drizzleType: "date" };
  }
  if (typeLower.includes("json") || typeLower.includes("jsonb")) {
    return { tsType: "any", sqlType: "JSONB", drizzleType: "jsonb" };
  }
  if (typeLower.includes("text")) {
    return { tsType: "string", sqlType: "TEXT", drizzleType: "text" };
  }
  return { tsType: "string", sqlType: "VARCHAR(255)", drizzleType: "varchar" };
}

export async function materializeProject(context: ProjectContext): Promise<MaterializedProject> {
  const projectDir = path.join(PROJECTS_DIR, context.projectId);
  const files: GeneratedFile[] = [];

  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(path.join(projectDir, "backend", "src", "routes"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "backend", "src", "db"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "frontend", "src", "pages"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "frontend", "src", "components"), { recursive: true });

  files.push(...generateBackendFiles(context));
  files.push(...generateDatabaseFiles(context));
  files.push(...generateFrontendFiles(context));
  files.push(...generateConfigFiles(context));

  for (const file of files) {
    const filePath = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, "utf-8");
  }

  return {
    projectDir,
    files,
    commands: {
      install: "cd backend && npm install && cd ../frontend && npm install",
      migrate: "cd backend && npm run db:push",
      start: "cd backend && npm run dev & cd ../frontend && npm run dev",
    },
  };
}

function generateBackendFiles(context: ProjectContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const allTables = context.modules.flatMap((m) => m.tables);
  const allApis = context.modules.flatMap((m) => m.apis);

  files.push({
    path: "backend/package.json",
    type: "backend",
    content: JSON.stringify(
      {
        name: `${toKebabCase(context.projectName)}-backend`,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
          "db:push": "drizzle-kit push",
          "db:generate": "drizzle-kit generate",
        },
        dependencies: {
          express: "^4.18.2",
          cors: "^2.8.5",
          dotenv: "^16.3.1",
          pg: "^8.11.3",
          "drizzle-orm": "^0.29.0",
          zod: "^3.22.4",
        },
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/node": "^20.10.0",
          "@types/cors": "^2.8.17",
          "@types/pg": "^8.10.9",
          typescript: "^5.3.2",
          tsx: "^4.6.2",
          "drizzle-kit": "^0.20.0",
        },
      },
      null,
      2
    ),
  });

  files.push({
    path: "backend/tsconfig.json",
    type: "config",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          outDir: "./dist",
          rootDir: "./src",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ["src/**/*"],
        exclude: ["node_modules"],
      },
      null,
      2
    ),
  });

  files.push({
    path: "backend/drizzle.config.ts",
    type: "config",
    content: `import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
`,
  });

  files.push({
    path: "backend/.env",
    type: "config",
    content: `DATABASE_URL=\${DATABASE_URL}
PORT=3001
`,
  });

  files.push({
    path: "backend/src/index.ts",
    type: "backend",
    content: `import "dotenv/config";
import express from "express";
import cors from "cors";
${context.modules.map((m) => `import ${toCamelCase(m.name)}Routes from "./routes/${toKebabCase(m.name)}.js";`).join("\n")}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, project: "${context.projectName}" }));

${context.modules.map((m) => `app.use("/api/${toKebabCase(m.name)}", ${toCamelCase(m.name)}Routes);`).join("\n")}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`${context.projectName} API running on port \${PORT}\`));
`,
  });

  files.push({
    path: "backend/src/db/index.ts",
    type: "database",
    content: `import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
`,
  });

  for (const module of context.modules) {
    files.push(generateRouteFile(module, context));
  }

  return files;
}

function generateRouteFile(module: ModuleDefinition, context: ProjectContext): GeneratedFile {
  const routeName = toKebabCase(module.name);
  const tables = module.tables;

  let imports = `import { Router } from "express";
import { db } from "../db/index.js";
import { ${tables.map((t) => toCamelCase(t.name)).join(", ")} } from "../db/schema.js";
import { eq } from "drizzle-orm";
`;

  let routes = `const router = Router();

`;

  for (const table of tables) {
    const tableCamel = toCamelCase(table.name);
    const tableKebab = toKebabCase(table.name);
    const pkColumn = table.columns.find((c) => c.primaryKey)?.name || "id";

    routes += `// ${toPascalCase(table.name)} CRUD
router.get("/${tableKebab}", async (_req, res) => {
  try {
    const items = await db.select().from(${tableCamel});
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ${table.name}" });
  }
});

router.get("/${tableKebab}/:id", async (req, res) => {
  try {
    const [item] = await db.select().from(${tableCamel}).where(eq(${tableCamel}.${pkColumn}, req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ${table.name}" });
  }
});

router.post("/${tableKebab}", async (req, res) => {
  try {
    const [item] = await db.insert(${tableCamel}).values(req.body).returning();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create ${table.name}" });
  }
});

router.put("/${tableKebab}/:id", async (req, res) => {
  try {
    const [item] = await db.update(${tableCamel}).set(req.body).where(eq(${tableCamel}.${pkColumn}, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to update ${table.name}" });
  }
});

router.delete("/${tableKebab}/:id", async (req, res) => {
  try {
    await db.delete(${tableCamel}).where(eq(${tableCamel}.${pkColumn}, req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete ${table.name}" });
  }
});

`;
  }

  routes += `export default router;
`;

  return {
    path: `backend/src/routes/${routeName}.ts`,
    type: "backend",
    content: imports + routes,
  };
}

function generateDatabaseFiles(context: ProjectContext): GeneratedFile[] {
  const allTables = context.modules.flatMap((m) => m.tables);
  const files: GeneratedFile[] = [];

  let schemaContent = `import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb, decimal, real, bigint, uuid, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

`;

  for (const table of allTables) {
    const tableCamel = toCamelCase(table.name);
    const tableSnake = toSnakeCase(table.name);

    schemaContent += `export const ${tableCamel} = pgTable("${tableSnake}", {\n`;

    for (const col of table.columns) {
      const colName = toCamelCase(col.name);
      const colSnake = toSnakeCase(col.name);
      const { drizzleType } = mapColumnType(col.type);

      let colDef = `  ${colName}: ${drizzleType}("${colSnake}")`;

      if (col.primaryKey) {
        colDef += ".primaryKey()";
      }
      if (!col.nullable && !col.primaryKey) {
        colDef += ".notNull()";
      }
      if (col.unique) {
        colDef += ".unique()";
      }

      schemaContent += colDef + ",\n";
    }

    schemaContent += `  createdAt: timestamp("created_at").defaultNow(),\n`;
    schemaContent += `  updatedAt: timestamp("updated_at").defaultNow(),\n`;
    schemaContent += `});\n\n`;
  }

  files.push({
    path: "backend/src/db/schema.ts",
    type: "database",
    content: schemaContent,
  });

  return files;
}

function generateFrontendFiles(context: ProjectContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: "frontend/package.json",
    type: "frontend",
    content: JSON.stringify(
      {
        name: `${toKebabCase(context.projectName)}-frontend`,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite --host 0.0.0.0 --port 3002",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.20.0",
        },
        devDependencies: {
          "@types/react": "^18.2.0",
          "@types/react-dom": "^18.2.0",
          "@vitejs/plugin-react": "^4.2.0",
          typescript: "^5.3.2",
          vite: "^5.0.0",
        },
      },
      null,
      2
    ),
  });

  files.push({
    path: "frontend/vite.config.ts",
    type: "config",
    content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3002,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
`,
  });

  files.push({
    path: "frontend/tsconfig.json",
    type: "config",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }]
      },
      null,
      2
    ),
  });

  files.push({
    path: "frontend/tsconfig.node.json",
    type: "config",
    content: JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true
        },
        include: ["vite.config.ts"]
      },
      null,
      2
    ),
  });

  files.push({
    path: "frontend/index.html",
    type: "frontend",
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${context.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  });

  files.push({
    path: "frontend/src/main.tsx",
    type: "frontend",
    content: `import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
`,
  });

  files.push({
    path: "frontend/src/index.css",
    type: "frontend",
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f8f9fa;
  font-weight: 600;
}

input, select, textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}
`,
  });

  let appRoutes = "";
  let appImports = "";

  for (const module of context.modules) {
    for (const screen of module.screens) {
      const componentName = toPascalCase(screen.name);
      const routePath = screen.route.startsWith("/") ? screen.route : `/${screen.route}`;

      appImports += `import ${componentName} from "./pages/${componentName}";\n`;
      appRoutes += `          <Route path="${routePath}" element={<${componentName} />} />\n`;

      files.push(generateScreenComponent(screen, module, context));
    }
  }

  files.push({
    path: "frontend/src/App.tsx",
    type: "frontend",
    content: `import { Routes, Route, Link } from "react-router-dom";
${appImports}

function App() {
  return (
    <div>
      <nav style={{ background: "#1e293b", padding: "16px", marginBottom: "20px" }}>
        <div className="container" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/" style={{ color: "white", fontWeight: "bold", textDecoration: "none", fontSize: "18px" }}>
            ${context.projectName}
          </Link>
          ${context.modules
            .flatMap((m) => m.screens)
            .map((s) => `<Link to="${s.route}" style={{ color: "#94a3b8", textDecoration: "none" }}>${toPascalCase(s.name)}</Link>`)
            .join("\n          ")}
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
${appRoutes}        </Routes>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="card">
      <h1>${context.projectName}</h1>
      <p style={{ marginTop: "12px", color: "#666" }}>
        Welcome to your ${context.domain} application. Select a module from the navigation to get started.
      </p>
    </div>
  );
}

export default App;
`,
  });

  return files;
}

function generateScreenComponent(
  screen: { name: string; type: string; route: string },
  module: ModuleDefinition,
  context: ProjectContext
): GeneratedFile {
  const componentName = toPascalCase(screen.name);
  const table = module.tables[0];

  if (!table) {
    return {
      path: `frontend/src/pages/${componentName}.tsx`,
      type: "frontend",
      content: `export default function ${componentName}() {
  return <div className="card"><h2>${screen.name}</h2><p>No data configured for this screen.</p></div>;
}
`,
    };
  }

  const tableName = table.name;
  const tableKebab = toKebabCase(tableName);
  const columns = table.columns.filter((c) => !c.primaryKey && c.name !== "created_at" && c.name !== "updated_at");

  if (screen.type === "list") {
    return {
      path: `frontend/src/pages/${componentName}.tsx`,
      type: "frontend",
      content: `import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface ${toPascalCase(tableName)} {
  ${table.columns.map((c) => `${toCamelCase(c.name)}: ${mapColumnType(c.type).tsType};`).join("\n  ")}
}

export default function ${componentName}() {
  const [items, setItems] = useState<${toPascalCase(tableName)}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/${toKebabCase(module.name)}/${tableKebab}")
      .then((res) => res.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>${toPascalCase(tableName)} List</h2>
        <Link to="${screen.route}/new" className="btn btn-primary">Add New</Link>
      </div>
      <table>
        <thead>
          <tr>
            ${columns.slice(0, 5).map((c) => `<th>${toPascalCase(c.name)}</th>`).join("\n            ")}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.${toCamelCase(table.columns.find((c) => c.primaryKey)?.name || "id")}}>
              ${columns.slice(0, 5).map((c) => `<td>{String(item.${toCamelCase(c.name)} ?? "")}</td>`).join("\n              ")}
              <td>
                <Link to={\`${screen.route}/\${item.${toCamelCase(table.columns.find((c) => c.primaryKey)?.name || "id")}}\`} className="btn" style={{ marginRight: "8px" }}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`,
    };
  }

  if (screen.type === "form") {
    return {
      path: `frontend/src/pages/${componentName}.tsx`,
      type: "frontend",
      content: `import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ${componentName}() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ${columns.map((c) => `${toCamelCase(c.name)}: ""`).join(",\n    ")}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/${toKebabCase(module.name)}/${tableKebab}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    navigate("${screen.route.replace("/new", "")}");
  };

  return (
    <div className="card">
      <h2>New ${toPascalCase(tableName)}</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
        ${columns
          .map(
            (c) => `<div className="form-group">
          <label>${toPascalCase(c.name)}</label>
          <input
            value={formData.${toCamelCase(c.name)}}
            onChange={(e) => setFormData({ ...formData, ${toCamelCase(c.name)}: e.target.value })}
          />
        </div>`
          )
          .join("\n        ")}
        <button type="submit" className="btn btn-primary">Save</button>
      </form>
    </div>
  );
}
`,
    };
  }

  return {
    path: `frontend/src/pages/${componentName}.tsx`,
    type: "frontend",
    content: `import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

export default function ${componentName}() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch(\`/api/${toKebabCase(module.name)}/${tableKebab}/\${id}\`)
        .then((res) => res.json())
        .then(setItem);
    }
  }, [id]);

  if (!item) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>${toPascalCase(tableName)} Details</h2>
        <Link to="${screen.route.replace("/:id", "")}" className="btn">Back to List</Link>
      </div>
      <dl>
        ${table.columns.map((c) => `<div style={{ marginBottom: "12px" }}><dt style={{ fontWeight: "600" }}>${toPascalCase(c.name)}</dt><dd>{String(item.${toCamelCase(c.name)} ?? "-")}</dd></div>`).join("\n        ")}
      </dl>
    </div>
  );
}
`,
  };
}

function generateConfigFiles(context: ProjectContext): GeneratedFile[] {
  return [
    {
      path: "README.md",
      type: "config",
      content: `# ${context.projectName}

A ${context.domain} application generated by IPL Platform.

## Getting Started

\`\`\`bash
# Install backend dependencies
cd backend && npm install

# Run database migrations
npm run db:push

# Start backend server
npm run dev

# In another terminal, install frontend dependencies
cd frontend && npm install

# Start frontend
npm run dev
\`\`\`

## Modules

${context.modules.map((m) => `### ${m.name}\n${m.description}\n- Tables: ${m.tables.map((t) => t.name).join(", ")}\n- Screens: ${m.screens.map((s) => s.name).join(", ")}`).join("\n\n")}
`,
    },
  ];
}

export async function getProjectFiles(projectId: string): Promise<GeneratedFile[]> {
  const projectDir = path.join(PROJECTS_DIR, projectId);
  const files: GeneratedFile[] = [];

  async function readDir(dir: string, basePath: string = ""): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory() && entry.name !== "node_modules") {
          await readDir(fullPath, relativePath);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({
            path: relativePath,
            content,
            type: relativePath.includes("backend")
              ? "backend"
              : relativePath.includes("frontend")
              ? "frontend"
              : "config",
          });
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  await readDir(projectDir);
  return files;
}
