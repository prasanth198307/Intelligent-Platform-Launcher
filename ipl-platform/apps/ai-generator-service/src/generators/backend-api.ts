export interface BackendApiConfig {
  framework: 'nodejs' | 'python' | 'go';
  domain: string;
  database: string;
  projectName?: string;
  tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }>;
  }>;
  authentication: boolean;
  port?: number;
}

export interface GeneratedBackendApi {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  dependencies: Record<string, string>;
}

function toPascalCase(str: string): string {
  return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/\s+/g, '');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[-\s]+/g, '_');
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

export function generateBackendApi(config: BackendApiConfig): GeneratedBackendApi {
  switch (config.framework) {
    case 'nodejs':
      return generateNodejsExpress(config);
    case 'python':
      return generatePythonFastAPI(config);
    case 'go':
      return generateGoGin(config);
    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }
}

function generateNodejsExpress(config: BackendApiConfig): GeneratedBackendApi {
  const projectName = config.projectName || `${toKebabCase(config.domain)}-api`;
  const port = config.port || 3000;
  const files: GeneratedBackendApi['files'] = [];

  files.push({
    path: 'package.json',
    description: 'Project dependencies and scripts',
    content: JSON.stringify({
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        lint: 'eslint src --ext .ts',
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.3.1',
        pg: '^8.11.3',
        bcryptjs: '^2.4.3',
        jsonwebtoken: '^9.0.2',
        zod: '^3.22.4',
      },
      devDependencies: {
        '@types/express': '^4.17.21',
        '@types/node': '^20.10.0',
        '@types/cors': '^2.8.17',
        '@types/bcryptjs': '^2.4.6',
        '@types/jsonwebtoken': '^9.0.5',
        '@types/pg': '^8.10.9',
        typescript: '^5.3.2',
        tsx: '^4.6.2',
        eslint: '^8.55.0',
        '@typescript-eslint/eslint-plugin': '^6.13.2',
        '@typescript-eslint/parser': '^6.13.2',
      },
    }, null, 2),
  });

  files.push({
    path: 'tsconfig.json',
    description: 'TypeScript configuration',
    content: JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }, null, 2),
  });

  files.push({
    path: '.env.example',
    description: 'Environment variables template',
    content: `DATABASE_URL=postgresql://user:password@localhost:5432/${projectName}
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=${port}
NODE_ENV=development
`,
  });

  files.push({
    path: 'src/index.ts',
    description: 'Application entry point',
    content: `import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
${config.authentication ? "import { authMiddleware } from './middleware/auth.js';" : ''}
${config.tables.map(t => `import ${toCamelCase(t.name)}Routes from './routes/${toKebabCase(t.name)}.routes.js';`).join('\n')}
${config.authentication ? "import authRoutes from './routes/auth.routes.js';" : ''}

const app = express();
const PORT = Number(process.env.PORT || ${port});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: '${projectName}' });
});

${config.authentication ? `app.use('/api/auth', authRoutes);` : ''}
${config.tables.map(t => `app.use('/api/${toKebabCase(t.name)}', ${config.authentication ? 'authMiddleware, ' : ''}${toCamelCase(t.name)}Routes);`).join('\n')}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
  });

  files.push({
    path: 'src/config/database.ts',
    description: 'Database connection configuration',
    content: generateNodeDbConfig(config.database),
  });

  files.push({
    path: 'src/middleware/errorHandler.ts',
    description: 'Global error handling middleware',
    content: `import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    ok: false,
    error: 'Internal server error',
  });
}
`,
  });

  if (config.authentication) {
    files.push({
      path: 'src/middleware/auth.ts',
      description: 'JWT authentication middleware',
      content: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Invalid token', 401));
  }
}

export function generateToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
`,
    });

    files.push({
      path: 'src/routes/auth.routes.ts',
      description: 'Authentication routes',
      content: `import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await pool.query('SELECT id, email, name, password FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError('Unauthorized', 401);
    
    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) throw new AppError('User not found', 404);
    
    res.json({ ok: true, user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
`,
    });
  }

  for (const table of config.tables) {
    files.push({
      path: `src/routes/${toKebabCase(table.name)}.routes.ts`,
      description: `${table.name} CRUD routes`,
      content: generateNodeRoutes(table, config),
    });

    files.push({
      path: `src/controllers/${toKebabCase(table.name)}.controller.ts`,
      description: `${table.name} controller`,
      content: generateNodeController(table, config),
    });

    files.push({
      path: `src/models/${toKebabCase(table.name)}.model.ts`,
      description: `${table.name} model/types`,
      content: generateNodeModel(table),
    });
  }

  files.push({
    path: 'src/types/index.ts',
    description: 'Shared TypeScript types',
    content: `export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
`,
  });

  files.push({
    path: 'Dockerfile',
    description: 'Docker container configuration',
    content: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
ENV NODE_ENV=production
EXPOSE ${port}
CMD ["node", "dist/index.js"]
`,
  });

  files.push({
    path: '.gitignore',
    description: 'Git ignore file',
    content: `node_modules/
dist/
.env
*.log
.DS_Store
coverage/
`,
  });

  files.push({
    path: 'README.md',
    description: 'Project documentation',
    content: generateNodeReadme(projectName, config, port),
  });

  const dependencies: Record<string, string> = {
    express: '^4.18.2',
    cors: '^2.8.5',
    dotenv: '^16.3.1',
    pg: '^8.11.3',
    bcryptjs: '^2.4.3',
    jsonwebtoken: '^9.0.2',
    zod: '^3.22.4',
  };

  const instructions = `## Setup Instructions

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Create a \`.env\` file from the template:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Update the DATABASE_URL in .env with your database credentials

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

5. Build for production:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## API Endpoints

${config.authentication ? `### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login and get JWT token
- GET /api/auth/me - Get current user info
` : ''}
${config.tables.map(t => `### ${toPascalCase(t.name)}
- GET /api/${toKebabCase(t.name)} - List all (paginated)
- GET /api/${toKebabCase(t.name)}/:id - Get by ID
- POST /api/${toKebabCase(t.name)} - Create new
- PUT /api/${toKebabCase(t.name)}/:id - Update by ID
- DELETE /api/${toKebabCase(t.name)}/:id - Delete by ID`).join('\n\n')}
`;

  return { files, instructions, dependencies };
}

function generateNodeDbConfig(database: string): string {
  if (database === 'mongodb') {
    return `import { MongoClient, Db } from 'mongodb';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/app';

let db: Db;
const client = new MongoClient(DATABASE_URL);

export async function connectDB(): Promise<Db> {
  if (db) return db;
  await client.connect();
  db = client.db();
  console.log('Connected to MongoDB');
  return db;
}

export { client, db };
`;
  }

  return `import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
}
`;
}

function generateNodeRoutes(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }, config: BackendApiConfig): string {
  const name = toCamelCase(table.name);
  const Name = toPascalCase(table.name);
  const kebab = toKebabCase(table.name);

  return `import { Router } from 'express';
import {
  getAll${Name},
  get${Name}ById,
  create${Name},
  update${Name},
  delete${Name},
} from '../controllers/${kebab}.controller.js';

const router = Router();

router.get('/', getAll${Name});
router.get('/:id', get${Name}ById);
router.post('/', create${Name});
router.put('/:id', update${Name});
router.delete('/:id', delete${Name});

export default router;
`;
}

function generateNodeController(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }, config: BackendApiConfig): string {
  const name = toCamelCase(table.name);
  const Name = toPascalCase(table.name);
  const snake = toSnakeCase(table.name);
  const columns = table.columns.filter(c => !c.primaryKey);
  const insertCols = columns.map(c => toSnakeCase(c.name)).join(', ');
  const insertPlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const updateSet = columns.map((c, i) => `${toSnakeCase(c.name)} = $${i + 1}`).join(', ');

  return `import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const ${name}Schema = z.object({
${columns.map(c => `  ${toCamelCase(c.name)}: z.${getZodType(c.type)}()${c.nullable ? '.optional()' : ''},`).join('\n')}
});

export async function getAll${Name}(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM ${snake}');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM ${snake} ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      ok: true,
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function get${Name}ById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ${snake} WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('${Name} not found', 404);
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function create${Name}(req: Request, res: Response, next: NextFunction) {
  try {
    const data = ${name}Schema.parse(req.body);
    
    const result = await pool.query(
      \`INSERT INTO ${snake} (${insertCols}) VALUES (${insertPlaceholders}) RETURNING *\`,
      [${columns.map(c => `data.${toCamelCase(c.name)}`).join(', ')}]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function update${Name}(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = ${name}Schema.partial().parse(req.body);

    const existing = await pool.query('SELECT id FROM ${snake} WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new AppError('${Name} not found', 404);
    }

    const result = await pool.query(
      \`UPDATE ${snake} SET ${updateSet}, updated_at = NOW() WHERE id = $${columns.length + 1} RETURNING *\`,
      [${columns.map(c => `data.${toCamelCase(c.name)}`).join(', ')}, id]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function delete${Name}(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM ${snake} WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      throw new AppError('${Name} not found', 404);
    }

    res.json({ ok: true, message: '${Name} deleted successfully' });
  } catch (error) {
    next(error);
  }
}
`;
}

function generateNodeModel(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }): string {
  const Name = toPascalCase(table.name);

  return `export interface ${Name} {
${table.columns.map(c => `  ${toCamelCase(c.name)}${c.nullable ? '?' : ''}: ${getTsType(c.type)};`).join('\n')}
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Create${Name}Input {
${table.columns.filter(c => !c.primaryKey).map(c => `  ${toCamelCase(c.name)}${c.nullable ? '?' : ''}: ${getTsType(c.type)};`).join('\n')}
}

export interface Update${Name}Input {
${table.columns.filter(c => !c.primaryKey).map(c => `  ${toCamelCase(c.name)}?: ${getTsType(c.type)};`).join('\n')}
}
`;
}

function generateNodeReadme(projectName: string, config: BackendApiConfig, port: number): string {
  return `# ${projectName}

A ${toPascalCase(config.domain)} API built with Node.js, Express, and TypeScript.

## Features

- RESTful API endpoints
- ${config.database} database integration
${config.authentication ? '- JWT authentication\n- User registration and login' : ''}
- Input validation with Zod
- Error handling middleware
- Docker support

## Prerequisites

- Node.js 20+
- ${config.database === 'postgresql' ? 'PostgreSQL' : config.database === 'mysql' ? 'MySQL' : config.database === 'mongodb' ? 'MongoDB' : 'Database'} database

## Installation

\`\`\`bash
npm install
cp .env.example .env
# Update .env with your database credentials
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Docker

\`\`\`bash
docker build -t ${projectName} .
docker run -p ${port}:${port} --env-file .env ${projectName}
\`\`\`

## API Documentation

Base URL: \`http://localhost:${port}/api\`

### Health Check
- \`GET /health\` - Service health status

${config.authentication ? `### Authentication
- \`POST /api/auth/register\` - Register new user
- \`POST /api/auth/login\` - Login
- \`GET /api/auth/me\` - Get current user (requires auth)
` : ''}
${config.tables.map(t => `### ${toPascalCase(t.name)}
- \`GET /api/${toKebabCase(t.name)}\` - List all (paginated)
- \`GET /api/${toKebabCase(t.name)}/:id\` - Get by ID
- \`POST /api/${toKebabCase(t.name)}\` - Create
- \`PUT /api/${toKebabCase(t.name)}/:id\` - Update
- \`DELETE /api/${toKebabCase(t.name)}/:id\` - Delete`).join('\n\n')}

## License

MIT
`;
}

function generatePythonFastAPI(config: BackendApiConfig): GeneratedBackendApi {
  const projectName = config.projectName || `${toSnakeCase(config.domain)}_api`;
  const port = config.port || 8000;
  const files: GeneratedBackendApi['files'] = [];

  files.push({
    path: 'requirements.txt',
    description: 'Python dependencies',
    content: `fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
python-dotenv==1.0.0
${config.database === 'mongodb' ? 'motor==3.3.2\npymongo==4.6.1' : 'psycopg2-binary==2.9.9\nsqlalchemy==2.0.25'}
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
`,
  });

  files.push({
    path: 'main.py',
    description: 'FastAPI application entry point',
    content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.database import engine, Base
${config.authentication ? 'from app.routers import auth' : ''}
${config.tables.map(t => `from app.routers import ${toSnakeCase(t.name)}`).join('\n')}

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="${toPascalCase(config.domain)} API",
    description="API for ${config.domain} domain",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"ok": True, "service": "${projectName}"}

${config.authentication ? 'app.include_router(auth.router, prefix="/api/auth", tags=["auth"])' : ''}
${config.tables.map(t => `app.include_router(${toSnakeCase(t.name)}.router, prefix="/api/${toKebabCase(t.name)}", tags=["${t.name}"])`).join('\n')}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=${port}, reload=True)
`,
  });

  files.push({
    path: '.env.example',
    description: 'Environment variables template',
    content: `DATABASE_URL=postgresql://user:password@localhost:5432/${projectName}
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
`,
  });

  files.push({
    path: 'app/__init__.py',
    description: 'App package init',
    content: '',
  });

  files.push({
    path: 'app/config.py',
    description: 'Configuration settings',
    content: `from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://localhost:5432/${projectName}"
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
`,
  });

  files.push({
    path: 'app/database.py',
    description: 'Database connection',
    content: `from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`,
  });

  files.push({
    path: 'app/routers/__init__.py',
    description: 'Routers package init',
    content: '',
  });

  files.push({
    path: 'app/models/__init__.py',
    description: 'Models package init',
    content: '',
  });

  files.push({
    path: 'app/schemas/__init__.py',
    description: 'Schemas package init',
    content: '',
  });

  if (config.authentication) {
    files.push({
      path: 'app/dependencies.py',
      description: 'Dependency injection',
      content: `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from .config import settings
from .models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
`,
    });

    files.push({
      path: 'app/models/user.py',
      description: 'User model',
      content: `from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
`,
    });

    files.push({
      path: 'app/schemas/user.py',
      description: 'User schemas',
      content: `from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
`,
    });

    files.push({
      path: 'app/routers/auth.py',
      description: 'Authentication routes',
      content: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from ..database import get_db
from ..config import settings
from ..models.user import User
from ..schemas.user import UserCreate, UserResponse, Token
from ..dependencies import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

@router.post("/register", response_model=dict)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user.password)
    db_user = User(email=user.email, name=user.name, password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    token = create_access_token({"sub": str(db_user.id)})
    return {
        "ok": True,
        "user": {"id": db_user.id, "email": db_user.email, "name": db_user.name},
        "token": token
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
`,
    });
  }

  for (const table of config.tables) {
    files.push({
      path: `app/models/${toSnakeCase(table.name)}.py`,
      description: `${table.name} SQLAlchemy model`,
      content: generatePythonModel(table),
    });

    files.push({
      path: `app/schemas/${toSnakeCase(table.name)}.py`,
      description: `${table.name} Pydantic schemas`,
      content: generatePythonSchema(table),
    });

    files.push({
      path: `app/routers/${toSnakeCase(table.name)}.py`,
      description: `${table.name} CRUD routes`,
      content: generatePythonRouter(table, config),
    });
  }

  files.push({
    path: 'Dockerfile',
    description: 'Docker container configuration',
    content: `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE ${port}

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]
`,
  });

  files.push({
    path: '.gitignore',
    description: 'Git ignore file',
    content: `__pycache__/
*.py[cod]
*$py.class
.env
.venv/
venv/
*.egg-info/
dist/
build/
.pytest_cache/
`,
  });

  files.push({
    path: 'README.md',
    description: 'Project documentation',
    content: generatePythonReadme(projectName, config, port),
  });

  const dependencies: Record<string, string> = {
    fastapi: '0.109.0',
    uvicorn: '0.27.0',
    pydantic: '2.5.3',
    sqlalchemy: '2.0.25',
    psycopg2: '2.9.9',
  };

  const instructions = `## Setup Instructions

1. Create virtual environment:
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. Create .env file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Run development server:
   \`\`\`bash
   python main.py
   \`\`\`

5. API docs available at: http://localhost:${port}/docs
`;

  return { files, instructions, dependencies };
}

function generatePythonModel(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }): string {
  const Name = toPascalCase(table.name);
  const snake = toSnakeCase(table.name);

  return `from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base

class ${Name}(Base):
    __tablename__ = "${snake}"

${table.columns.map(c => `    ${toSnakeCase(c.name)} = Column(${getPythonSqlType(c.type)}${c.primaryKey ? ', primary_key=True, index=True' : ''}${c.nullable ? ', nullable=True' : ', nullable=False'})`).join('\n')}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
`;
}

function generatePythonSchema(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }): string {
  const Name = toPascalCase(table.name);
  const nonPkCols = table.columns.filter(c => !c.primaryKey);

  return `from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ${Name}Base(BaseModel):
${nonPkCols.map(c => `    ${toSnakeCase(c.name)}: ${getPythonType(c.type)}${c.nullable ? ' = None' : ''}`).join('\n')}

class ${Name}Create(${Name}Base):
    pass

class ${Name}Update(BaseModel):
${nonPkCols.map(c => `    ${toSnakeCase(c.name)}: Optional[${getPythonType(c.type)}] = None`).join('\n')}

class ${Name}Response(${Name}Base):
${table.columns.filter(c => c.primaryKey).map(c => `    ${toSnakeCase(c.name)}: int`).join('\n')}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ${Name}List(BaseModel):
    data: list[${Name}Response]
    total: int
    page: int
    limit: int
    total_pages: int
`;
}

function generatePythonRouter(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }, config: BackendApiConfig): string {
  const Name = toPascalCase(table.name);
  const snake = toSnakeCase(table.name);

  return `from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import math

from ..database import get_db
from ..models.${snake} import ${Name}
from ..schemas.${snake} import ${Name}Create, ${Name}Update, ${Name}Response, ${Name}List
${config.authentication ? `from ..dependencies import get_current_user
from ..models.user import User` : ''}

router = APIRouter()

@router.get("/", response_model=${Name}List)
def get_all(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)${config.authentication ? ',\n    current_user: User = Depends(get_current_user)' : ''}
):
    offset = (page - 1) * limit
    total = db.query(${Name}).count()
    items = db.query(${Name}).order_by(${Name}.id.desc()).offset(offset).limit(limit).all()
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

@router.get("/{id}", response_model=${Name}Response)
def get_by_id(
    id: int,
    db: Session = Depends(get_db)${config.authentication ? ',\n    current_user: User = Depends(get_current_user)' : ''}
):
    item = db.query(${Name}).filter(${Name}.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="${Name} not found")
    return item

@router.post("/", response_model=${Name}Response, status_code=201)
def create(
    data: ${Name}Create,
    db: Session = Depends(get_db)${config.authentication ? ',\n    current_user: User = Depends(get_current_user)' : ''}
):
    item = ${Name}(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{id}", response_model=${Name}Response)
def update(
    id: int,
    data: ${Name}Update,
    db: Session = Depends(get_db)${config.authentication ? ',\n    current_user: User = Depends(get_current_user)' : ''}
):
    item = db.query(${Name}).filter(${Name}.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="${Name} not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{id}")
def delete(
    id: int,
    db: Session = Depends(get_db)${config.authentication ? ',\n    current_user: User = Depends(get_current_user)' : ''}
):
    item = db.query(${Name}).filter(${Name}.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="${Name} not found")
    
    db.delete(item)
    db.commit()
    return {"ok": True, "message": "${Name} deleted successfully"}
`;
}

function generatePythonReadme(projectName: string, config: BackendApiConfig, port: number): string {
  return `# ${projectName}

A ${toPascalCase(config.domain)} API built with Python and FastAPI.

## Features

- FastAPI with automatic OpenAPI documentation
- SQLAlchemy ORM with ${config.database}
${config.authentication ? '- JWT authentication\n- User registration and login' : ''}
- Pydantic validation
- Docker support

## Prerequisites

- Python 3.11+
- ${config.database === 'postgresql' ? 'PostgreSQL' : config.database === 'mysql' ? 'MySQL' : 'Database'}

## Installation

\`\`\`bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
\`\`\`

## Development

\`\`\`bash
python main.py
\`\`\`

API documentation: http://localhost:${port}/docs

## Docker

\`\`\`bash
docker build -t ${projectName} .
docker run -p ${port}:${port} --env-file .env ${projectName}
\`\`\`

## License

MIT
`;
}

function generateGoGin(config: BackendApiConfig): GeneratedBackendApi {
  const projectName = config.projectName || `${toSnakeCase(config.domain)}-api`;
  const moduleName = `github.com/yourorg/${projectName}`;
  const port = config.port || 8080;
  const files: GeneratedBackendApi['files'] = [];

  files.push({
    path: 'go.mod',
    description: 'Go module definition',
    content: `module ${moduleName}

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/joho/godotenv v1.5.1
	github.com/lib/pq v1.10.9
	github.com/golang-jwt/jwt/v5 v5.2.0
	golang.org/x/crypto v0.18.0
)
`,
  });

  files.push({
    path: 'main.go',
    description: 'Application entry point',
    content: `package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"${moduleName}/config"
	"${moduleName}/middleware"
	"${moduleName}/routes"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	db, err := config.InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true, "service": "${projectName}"})
	})

	routes.SetupRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "${port}"
	}

	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}
`,
  });

  files.push({
    path: '.env.example',
    description: 'Environment variables template',
    content: `DATABASE_URL=postgresql://user:password@localhost:5432/${projectName}?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=${port}
`,
  });

  files.push({
    path: 'config/database.go',
    description: 'Database configuration',
    content: `package config

import (
	"database/sql"
	"os"

	_ "github.com/lib/pq"
)

func InitDB() (*sql.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://localhost:5432/${projectName}?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}
`,
  });

  files.push({
    path: 'middleware/cors.go',
    description: 'CORS middleware',
    content: `package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
`,
  });

  if (config.authentication) {
    files.push({
      path: 'middleware/auth.go',
      description: 'JWT authentication middleware',
      content: `package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int64  \`json:"user_id"\`
	Email  string \`json:"email"\`
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
`,
    });

    files.push({
      path: 'handlers/auth.go',
      description: 'Authentication handlers',
      content: `package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

type RegisterInput struct {
	Email    string \`json:"email" binding:"required,email"\`
	Password string \`json:"password" binding:"required,min=8"\`
	Name     string \`json:"name" binding:"required"\`
}

type LoginInput struct {
	Email    string \`json:"email" binding:"required,email"\`
	Password string \`json:"password" binding:"required"\`
}

type Claims struct {
	UserID int64  \`json:"user_id"\`
	Email  string \`json:"email"\`
	jwt.RegisteredClaims
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", input.Email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var userID int64
	err = h.db.QueryRow(
		"INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id",
		input.Email, string(hashedPassword), input.Name,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	token, err := generateToken(userID, input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ok":    true,
		"user":  gin.H{"id": userID, "email": input.Email, "name": input.Name},
		"token": token,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID int64
	var hashedPassword, name string
	err := h.db.QueryRow(
		"SELECT id, password, name FROM users WHERE email = $1",
		input.Email,
	).Scan(&userID, &hashedPassword, &name)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := generateToken(userID, input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":    true,
		"user":  gin.H{"id": userID, "email": input.Email, "name": name},
		"token": token,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetInt64("userID")
	
	var email, name string
	err := h.db.QueryRow("SELECT email, name FROM users WHERE id = $1", userID).Scan(&email, &name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"user": gin.H{"id": userID, "email": email, "name": name},
	})
}

func generateToken(userID int64, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
`,
    });
  }

  files.push({
    path: 'routes/routes.go',
    description: 'Route definitions',
    content: generateGoRoutes(config, moduleName),
  });

  for (const table of config.tables) {
    files.push({
      path: `handlers/${toSnakeCase(table.name)}.go`,
      description: `${table.name} handlers`,
      content: generateGoHandler(table, config),
    });

    files.push({
      path: `models/${toSnakeCase(table.name)}.go`,
      description: `${table.name} model`,
      content: generateGoModel(table),
    });
  }

  files.push({
    path: 'Dockerfile',
    description: 'Docker container configuration',
    content: `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE ${port}
CMD ["./main"]
`,
  });

  files.push({
    path: '.gitignore',
    description: 'Git ignore file',
    content: `*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
.env
vendor/
`,
  });

  files.push({
    path: 'README.md',
    description: 'Project documentation',
    content: generateGoReadme(projectName, config, port),
  });

  const dependencies: Record<string, string> = {
    gin: '1.9.1',
    godotenv: '1.5.1',
    pq: '1.10.9',
    jwt: '5.2.0',
  };

  const instructions = `## Setup Instructions

1. Initialize and download dependencies:
   \`\`\`bash
   go mod tidy
   \`\`\`

2. Create .env file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Run development server:
   \`\`\`bash
   go run main.go
   \`\`\`

4. Build for production:
   \`\`\`bash
   go build -o ${projectName}
   ./${projectName}
   \`\`\`
`;

  return { files, instructions, dependencies };
}

function generateGoRoutes(config: BackendApiConfig, moduleName: string): string {
  return `package routes

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"${moduleName}/handlers"
${config.authentication ? `	"${moduleName}/middleware"` : ''}
)

func SetupRoutes(r *gin.Engine, db *sql.DB) {
${config.authentication ? `	authHandler := handlers.NewAuthHandler(db)
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.GET("/me", middleware.AuthMiddleware(), authHandler.GetMe)
	}
` : ''}
${config.tables.map(t => {
  const Name = toPascalCase(t.name);
  const snake = toSnakeCase(t.name);
  const kebab = toKebabCase(t.name);
  return `	${toCamelCase(t.name)}Handler := handlers.New${Name}Handler(db)
	${toCamelCase(t.name)} := r.Group("/api/${kebab}")${config.authentication ? '.Use(middleware.AuthMiddleware())' : ''}
	{
		${toCamelCase(t.name)}.GET("/", ${toCamelCase(t.name)}Handler.GetAll)
		${toCamelCase(t.name)}.GET("/:id", ${toCamelCase(t.name)}Handler.GetByID)
		${toCamelCase(t.name)}.POST("/", ${toCamelCase(t.name)}Handler.Create)
		${toCamelCase(t.name)}.PUT("/:id", ${toCamelCase(t.name)}Handler.Update)
		${toCamelCase(t.name)}.DELETE("/:id", ${toCamelCase(t.name)}Handler.Delete)
	}`;
}).join('\n\n')}
}
`;
}

function generateGoHandler(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }, config: BackendApiConfig): string {
  const Name = toPascalCase(table.name);
  const snake = toSnakeCase(table.name);
  const nonPkCols = table.columns.filter(c => !c.primaryKey);

  return `package handlers

import (
	"database/sql"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ${Name}Handler struct {
	db *sql.DB
}

func New${Name}Handler(db *sql.DB) *${Name}Handler {
	return &${Name}Handler{db: db}
}

type ${Name}Input struct {
${nonPkCols.map(c => `	${toPascalCase(c.name)} ${getGoType(c.type)} \`json:"${toCamelCase(c.name)}"${c.nullable ? '' : ' binding:"required"'}\``).join('\n')}
}

func (h *${Name}Handler) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	err := h.db.QueryRow("SELECT COUNT(*) FROM ${snake}").Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rows, err := h.db.Query("SELECT * FROM ${snake} ORDER BY id DESC LIMIT $1 OFFSET $2", limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		item := make(map[string]interface{})
		// Scan implementation depends on columns
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":         true,
		"data":       items,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *${Name}Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	
	row := h.db.QueryRow("SELECT * FROM ${snake} WHERE id = $1", id)
	_ = row // Scan implementation depends on columns

	c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"id": id}})
}

func (h *${Name}Handler) Create(c *gin.Context) {
	var input ${Name}Input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var id int64
	err := h.db.QueryRow(
		"INSERT INTO ${snake} (${nonPkCols.map(c => toSnakeCase(c.name)).join(', ')}) VALUES (${nonPkCols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id",
		${nonPkCols.map(c => `input.${toPascalCase(c.name)}`).join(', ')},
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true, "data": gin.H{"id": id}})
}

func (h *${Name}Handler) Update(c *gin.Context) {
	id := c.Param("id")
	
	var input ${Name}Input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.db.Exec(
		"UPDATE ${snake} SET ${nonPkCols.map((c, i) => `${toSnakeCase(c.name)} = $${i + 1}`).join(', ')}, updated_at = NOW() WHERE id = $${nonPkCols.length + 1}",
		${nonPkCols.map(c => `input.${toPascalCase(c.name)}`).join(', ')}, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "${Name} not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true, "data": gin.H{"id": id}})
}

func (h *${Name}Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	result, err := h.db.Exec("DELETE FROM ${snake} WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "${Name} not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "${Name} deleted successfully"})
}
`;
}

function generateGoModel(table: { name: string; columns: Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean }> }): string {
  const Name = toPascalCase(table.name);

  return `package models

import "time"

type ${Name} struct {
${table.columns.map(c => `	${toPascalCase(c.name)} ${getGoType(c.type)} \`json:"${toCamelCase(c.name)}" db:"${toSnakeCase(c.name)}"\``).join('\n')}
	CreatedAt time.Time  \`json:"createdAt" db:"created_at"\`
	UpdatedAt *time.Time \`json:"updatedAt" db:"updated_at"\`
}
`;
}

function generateGoReadme(projectName: string, config: BackendApiConfig, port: number): string {
  return `# ${projectName}

A ${toPascalCase(config.domain)} API built with Go and Gin.

## Features

- Gin web framework
- PostgreSQL with database/sql
${config.authentication ? '- JWT authentication\n- User registration and login' : ''}
- Docker support

## Prerequisites

- Go 1.21+
- PostgreSQL

## Installation

\`\`\`bash
go mod tidy
cp .env.example .env
\`\`\`

## Development

\`\`\`bash
go run main.go
\`\`\`

## Production

\`\`\`bash
go build -o ${projectName}
./${projectName}
\`\`\`

## Docker

\`\`\`bash
docker build -t ${projectName} .
docker run -p ${port}:${port} --env-file .env ${projectName}
\`\`\`

## License

MIT
`;
}

function getZodType(dbType: string): string {
  const lower = dbType.toLowerCase();
  if (lower.includes('int') || lower.includes('serial')) return 'number';
  if (lower.includes('float') || lower.includes('decimal') || lower.includes('numeric')) return 'number';
  if (lower.includes('bool')) return 'boolean';
  if (lower.includes('date') || lower.includes('time')) return 'string';
  return 'string';
}

function getTsType(dbType: string): string {
  const lower = dbType.toLowerCase();
  if (lower.includes('int') || lower.includes('serial') || lower.includes('float') || lower.includes('decimal') || lower.includes('numeric')) return 'number';
  if (lower.includes('bool')) return 'boolean';
  return 'string';
}

function getPythonType(dbType: string): string {
  const lower = dbType.toLowerCase();
  if (lower.includes('int') || lower.includes('serial')) return 'int';
  if (lower.includes('float') || lower.includes('decimal') || lower.includes('numeric')) return 'float';
  if (lower.includes('bool')) return 'bool';
  return 'str';
}

function getPythonSqlType(dbType: string): string {
  const lower = dbType.toLowerCase();
  if (lower.includes('serial')) return 'Integer';
  if (lower.includes('int')) return 'Integer';
  if (lower.includes('float') || lower.includes('decimal') || lower.includes('numeric')) return 'Float';
  if (lower.includes('bool')) return 'Boolean';
  if (lower.includes('text')) return 'Text';
  if (lower.includes('date')) return 'DateTime';
  return 'String';
}

function getGoType(dbType: string): string {
  const lower = dbType.toLowerCase();
  if (lower.includes('serial') || lower.includes('int')) return 'int64';
  if (lower.includes('float') || lower.includes('decimal') || lower.includes('numeric')) return 'float64';
  if (lower.includes('bool')) return 'bool';
  return 'string';
}
