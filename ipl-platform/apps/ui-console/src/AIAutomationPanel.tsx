import { useState } from 'react';

interface AIAutomationPanelProps {
  domain: string;
}

interface VulnerabilityResult {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  location: string;
  fix: string;
}

interface DebugResult {
  issue: string;
  rootCause: string;
  suggestion: string;
  codeExample?: string;
}

export default function AIAutomationPanel({ domain }: AIAutomationPanelProps) {
  const [activeTab, setActiveTab] = useState<'nl2code' | 'security' | 'debug'>('nl2code');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState<'typescript' | 'python' | 'go'>('typescript');
  const [generating, setGenerating] = useState(false);
  
  const [codeToScan, setCodeToScan] = useState('');
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityResult[]>([]);
  const [scanning, setScanning] = useState(false);
  
  const [errorDescription, setErrorDescription] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [debugging, setDebugging] = useState(false);

  const generateFromNL = async () => {
    if (!nlPrompt.trim()) return;
    setGenerating(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const templates: Record<string, Record<string, string>> = {
      typescript: {
        'user authentication': `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function registerUser(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash
  };
  // Save to database
  return user;
}

export async function loginUser(email: string, password: string): Promise<string | null> {
  // Fetch user from database
  const user = await findUserByEmail(email);
  if (!user) return null;
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).userId = (decoded as any).userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}`,
        'crud api': `import express, { Request, Response } from 'express';

interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const router = express.Router();
const items: Map<string, Item> = new Map();

// Create
router.post('/', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const item: Item = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  items.set(item.id, item);
  res.status(201).json(item);
});

// Read all
router.get('/', (req: Request, res: Response) => {
  res.json(Array.from(items.values()));
});

// Read one
router.get('/:id', (req: Request, res: Response) => {
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Update
router.put('/:id', (req: Request, res: Response) => {
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  const updated = { ...item, ...req.body, updatedAt: new Date() };
  items.set(req.params.id, updated);
  res.json(updated);
});

// Delete
router.delete('/:id', (req: Request, res: Response) => {
  if (!items.delete(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).send();
});

export default router;`,
        'default': `// Generated code based on your request
import { z } from 'zod';

// Input validation schema
const InputSchema = z.object({
  data: z.string(),
  options: z.object({
    validate: z.boolean().default(true),
    transform: z.boolean().default(false)
  }).optional()
});

type Input = z.infer<typeof InputSchema>;

export async function processRequest(input: Input): Promise<Result> {
  const validated = InputSchema.parse(input);
  
  // Process the request
  const result = await performOperation(validated);
  
  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  };
}

interface Result {
  success: boolean;
  data: any;
  timestamp: string;
}`
      },
      python: {
        'user authentication': `from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class User(BaseModel):
    id: str
    email: str
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user`,
        'default': `from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RequestModel(BaseModel):
    data: str
    options: Optional[dict] = None

class ResponseModel(BaseModel):
    success: bool
    data: dict
    timestamp: datetime

async def process_request(request: RequestModel) -> ResponseModel:
    """Process the incoming request and return result."""
    
    # Validate and process
    result = await perform_operation(request.data)
    
    return ResponseModel(
        success=True,
        data=result,
        timestamp=datetime.utcnow()
    )`
      },
      go: {
        'default': `package main

import (
        "encoding/json"
        "net/http"
        "time"

        "github.com/gin-gonic/gin"
        "github.com/google/uuid"
)

type Request struct {
        Data    string            \`json:"data" binding:"required"\`
        Options map[string]string \`json:"options"\`
}

type Response struct {
        Success   bool        \`json:"success"\`
        Data      interface{} \`json:"data"\`
        Timestamp time.Time   \`json:"timestamp"\`
}

func ProcessHandler(c *gin.Context) {
        var req Request
        if err := c.ShouldBindJSON(&req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                return
        }

        // Process the request
        result := processData(req.Data)

        c.JSON(http.StatusOK, Response{
                Success:   true,
                Data:      result,
                Timestamp: time.Now(),
        })
}

func main() {
        r := gin.Default()
        r.POST("/process", ProcessHandler)
        r.Run(":8080")
}`
      }
    };

    const promptLower = nlPrompt.toLowerCase();
    let template = templates[codeLanguage]['default'];
    
    if (promptLower.includes('auth') || promptLower.includes('login') || promptLower.includes('user')) {
      template = templates[codeLanguage]['user authentication'] || template;
    } else if (promptLower.includes('crud') || promptLower.includes('api') || promptLower.includes('rest')) {
      template = templates[codeLanguage]['crud api'] || template;
    }
    
    setGeneratedCode(template);
    setGenerating(false);
  };

  const scanForVulnerabilities = async () => {
    if (!codeToScan.trim()) return;
    setScanning(true);
    
    await new Promise(r => setTimeout(r, 1200));
    
    const mockVulnerabilities: VulnerabilityResult[] = [];
    const code = codeToScan.toLowerCase();
    
    if (code.includes('eval(') || code.includes('exec(')) {
      mockVulnerabilities.push({
        severity: 'critical',
        type: 'Code Injection',
        description: 'Use of eval() or exec() can lead to arbitrary code execution',
        location: 'Line containing eval/exec',
        fix: 'Use safer alternatives like JSON.parse() for data parsing or specific parsing libraries'
      });
    }
    
    if (code.includes('password') && (code.includes('console.log') || code.includes('print('))) {
      mockVulnerabilities.push({
        severity: 'high',
        type: 'Sensitive Data Exposure',
        description: 'Password or sensitive data may be logged to console',
        location: 'Password handling code',
        fix: 'Remove logging of sensitive data, use proper secret management'
      });
    }
    
    if (code.includes('sql') && (code.includes("'+") || code.includes('"+') || code.includes('f"'))) {
      mockVulnerabilities.push({
        severity: 'critical',
        type: 'SQL Injection',
        description: 'String concatenation in SQL queries can lead to SQL injection',
        location: 'SQL query construction',
        fix: 'Use parameterized queries or prepared statements'
      });
    }
    
    if (code.includes('cors') && code.includes('*')) {
      mockVulnerabilities.push({
        severity: 'medium',
        type: 'Insecure CORS',
        description: 'Wildcard CORS origin allows any domain to access your API',
        location: 'CORS configuration',
        fix: 'Specify explicit allowed origins instead of using wildcard'
      });
    }
    
    if (code.includes('http://') && !code.includes('localhost')) {
      mockVulnerabilities.push({
        severity: 'medium',
        type: 'Insecure Protocol',
        description: 'Using HTTP instead of HTTPS for external communication',
        location: 'URL definitions',
        fix: 'Use HTTPS for all external communications'
      });
    }
    
    if (code.includes('secret') && code.includes('=') && code.includes('"')) {
      mockVulnerabilities.push({
        severity: 'high',
        type: 'Hardcoded Secret',
        description: 'Secret or API key appears to be hardcoded',
        location: 'Secret assignment',
        fix: 'Use environment variables or a secret management service'
      });
    }
    
    if (mockVulnerabilities.length === 0) {
      mockVulnerabilities.push({
        severity: 'low',
        type: 'No Issues Found',
        description: 'No obvious security vulnerabilities detected in the provided code',
        location: 'N/A',
        fix: 'Continue following security best practices'
      });
    }
    
    setVulnerabilities(mockVulnerabilities);
    setScanning(false);
  };

  const debugError = async () => {
    if (!errorDescription.trim()) return;
    setDebugging(true);
    
    await new Promise(r => setTimeout(r, 1000));
    
    const errorLower = errorDescription.toLowerCase();
    let result: DebugResult;
    
    if (errorLower.includes('undefined') || errorLower.includes('null')) {
      result = {
        issue: 'Null/Undefined Reference Error',
        rootCause: 'Attempting to access a property or method on a null or undefined value. This commonly occurs when:\n1. An API response is not being awaited properly\n2. Optional chaining is not used for potentially undefined values\n3. State is accessed before initialization',
        suggestion: 'Use optional chaining (?.) and nullish coalescing (??) operators. Add proper null checks before accessing nested properties.',
        codeExample: `// Before (problematic)
const name = user.profile.name;

// After (safe)
const name = user?.profile?.name ?? 'Unknown';

// Or with explicit check
if (user && user.profile) {
  const name = user.profile.name;
}`
      };
    } else if (errorLower.includes('cors')) {
      result = {
        issue: 'CORS (Cross-Origin Resource Sharing) Error',
        rootCause: 'The server is not configured to accept requests from your frontend origin. The browser blocks these requests for security.',
        suggestion: 'Configure CORS on your backend server to allow requests from your frontend domain.',
        codeExample: `// Express.js
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`
      };
    } else if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      result = {
        issue: 'Request Timeout Error',
        rootCause: 'The request took longer than the configured timeout period. This could be due to:\n1. Slow database queries\n2. Network latency\n3. Server overload\n4. Infinite loops or blocking operations',
        suggestion: 'Increase timeout limits, optimize slow queries, add pagination for large datasets, or implement request queuing.',
        codeExample: `// Increase axios timeout
axios.get('/api/data', { timeout: 30000 });

// Add database query timeout
const result = await db.query(sql, {
  timeout: 10000 // 10 seconds
});

// Use Promise.race for custom timeout
const result = await Promise.race([
  fetchData(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);`
      };
    } else if (errorLower.includes('memory') || errorLower.includes('heap')) {
      result = {
        issue: 'Memory Error / Heap Overflow',
        rootCause: 'The application is consuming more memory than available. Common causes:\n1. Memory leaks from unclosed connections\n2. Large data structures in memory\n3. Recursive functions without proper termination\n4. Event listener accumulation',
        suggestion: 'Profile memory usage, implement pagination, use streams for large files, and ensure proper cleanup of resources.',
        codeExample: `// Use streams instead of loading entire file
const stream = fs.createReadStream('large-file.json');
stream.pipe(parser).on('data', (chunk) => {
  processChunk(chunk);
});

// Cleanup event listeners
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);`
      };
    } else {
      result = {
        issue: 'General Application Error',
        rootCause: 'Based on the error description, this appears to be a runtime error. Review the stack trace for the exact location and context of the error.',
        suggestion: '1. Check the stack trace for the error origin\n2. Add try-catch blocks for proper error handling\n3. Validate inputs before processing\n4. Add logging to track the issue',
        codeExample: `// Add comprehensive error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', {
    message: error.message,
    stack: error.stack,
    context: { /* relevant data */ }
  });
  
  // Handle specific error types
  if (error instanceof ValidationError) {
    return { error: 'Invalid input', details: error.details };
  }
  
  throw error; // Re-throw unexpected errors
}`
      };
    }
    
    setDebugResult(result);
    setDebugging(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'nl2code', label: 'Natural Language to Code', icon: '🪄' },
          { id: 'security', label: 'Security Scanner', icon: '🔒' },
          { id: 'debug', label: 'AI Debugger', icon: '🐛' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? '#334155' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === tab.id ? '#e2e8f0' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {activeTab === 'nl2code' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Describe what you want to build in plain English, and AI will generate the code for you.
            </p>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>Language</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['typescript', 'python', 'go'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    style={{
                      padding: '6px 16px',
                      background: codeLanguage === lang ? '#8b5cf6' : '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {lang === 'typescript' ? '🔷 TypeScript' : lang === 'python' ? '🐍 Python' : '🔵 Go'}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder="Example: Create a user authentication system with JWT tokens, password hashing, and login/register endpoints"
              style={{
                width: '100%',
                height: 100,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: 12,
                color: '#e2e8f0',
                fontSize: 13,
                resize: 'vertical',
                marginBottom: 12,
              }}
            />

            <button
              onClick={generateFromNL}
              disabled={generating || !nlPrompt.trim()}
              style={{
                background: generating ? '#475569' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {generating ? '⏳ Generating...' : '🪄 Generate Code'}
            </button>

            {generatedCode && (
              <div style={{ marginTop: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Generated Code</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      padding: '4px 12px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 16,
                  color: '#e2e8f0',
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 400,
                }}>
                  {generatedCode}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Paste your code below to scan for security vulnerabilities and get fix recommendations.
            </p>
            
            <textarea
              value={codeToScan}
              onChange={(e) => setCodeToScan(e.target.value)}
              placeholder="Paste your code here to scan for security vulnerabilities..."
              style={{
                width: '100%',
                height: 200,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: 12,
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
                resize: 'vertical',
                marginBottom: 12,
              }}
            />

            <button
              onClick={scanForVulnerabilities}
              disabled={scanning || !codeToScan.trim()}
              style={{
                background: scanning ? '#475569' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: scanning ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {scanning ? '🔍 Scanning...' : '🔒 Scan for Vulnerabilities'}
            </button>

            {vulnerabilities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ color: '#e2e8f0', marginBottom: 12 }}>
                  Scan Results ({vulnerabilities.length} issues found)
                </h4>
                {vulnerabilities.map((vuln, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#0f172a',
                      border: `1px solid ${getSeverityColor(vuln.severity)}40`,
                      borderLeft: `4px solid ${getSeverityColor(vuln.severity)}`,
                      borderRadius: 6,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        background: getSeverityColor(vuln.severity),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {vuln.severity}
                      </span>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{vuln.type}</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{vuln.description}</p>
                    <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>
                      <strong>Location:</strong> {vuln.location}
                    </p>
                    <p style={{ color: '#10b981', fontSize: 12 }}>
                      <strong>Fix:</strong> {vuln.fix}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Describe the error you're encountering and paste the stack trace. AI will help identify the root cause and suggest fixes.
            </p>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>
                Error Description
              </label>
              <textarea
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                placeholder="Example: Getting 'Cannot read property of undefined' when trying to access user.profile.name after API call"
                style={{
                  width: '100%',
                  height: 80,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 12,
                  color: '#e2e8f0',
                  fontSize: 13,
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>
                Stack Trace (optional)
              </label>
              <textarea
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste the error stack trace here..."
                style={{
                  width: '100%',
                  height: 100,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 12,
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={debugError}
              disabled={debugging || !errorDescription.trim()}
              style={{
                background: debugging ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                color: 'white',
                cursor: debugging ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {debugging ? '🔍 Analyzing...' : '🐛 Debug Error'}
            </button>

            {debugResult && (
              <div style={{ marginTop: 16, background: '#0f172a', borderRadius: 8, padding: 16, border: '1px solid #334155' }}>
                <h4 style={{ color: '#f59e0b', marginBottom: 12 }}>🐛 {debugResult.issue}</h4>
                
                <div style={{ marginBottom: 12 }}>
                  <h5 style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 6 }}>Root Cause</h5>
                  <p style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'pre-line' }}>{debugResult.rootCause}</p>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <h5 style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 6 }}>Suggestion</h5>
                  <p style={{ color: '#10b981', fontSize: 12, whiteSpace: 'pre-line' }}>{debugResult.suggestion}</p>
                </div>
                
                {debugResult.codeExample && (
                  <div>
                    <h5 style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 6 }}>Code Example</h5>
                    <pre style={{
                      background: '#1e293b',
                      borderRadius: 6,
                      padding: 12,
                      color: '#e2e8f0',
                      fontSize: 11,
                      overflow: 'auto',
                    }}>
                      {debugResult.codeExample}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
