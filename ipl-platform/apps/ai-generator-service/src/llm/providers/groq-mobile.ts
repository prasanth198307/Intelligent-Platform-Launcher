import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL
  });
};

export interface MobileAppConfig {
  domain: string;
  projectName: string;
  platforms: string[];
  features: string[];
  modules: Array<{ name: string; description: string }>;
  screens: Array<{ name: string; type: string; description?: string }>;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
  framework: string;
  authentication: boolean;
  offlineSync: boolean;
  pushNotifications: boolean;
}

export interface GeneratedMobileApp {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  dependencies: Record<string, string>;
}

export async function groqGenerateMobileApp(config: MobileAppConfig): Promise<GeneratedMobileApp> {
  const client = getClient();

  const screensList = config.screens?.map(s => `- ${s.name} (${s.type}): ${s.description || ''}`).join('\n') || 'No screens defined';
  const tablesList = config.tables?.map(t => `- ${t.name}: ${t.columns.map(c => c.name).join(', ')}`).join('\n') || 'No tables defined';
  const modulesList = config.modules?.map(m => `- ${m.name}: ${m.description}`).join('\n') || 'No modules defined';

  const prompt = `Generate a complete React Native/Expo mobile app for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Platforms: ${config.platforms.join(', ')}
Features: ${config.features.join(', ')}
Authentication: ${config.authentication ? 'Yes' : 'No'}
Offline Sync: ${config.offlineSync ? 'Yes' : 'No'}
Push Notifications: ${config.pushNotifications ? 'Yes' : 'No'}

MODULES:
${modulesList}

SCREENS TO GENERATE:
${screensList}

DATABASE TABLES (for API integration):
${tablesList}

Generate a COMPLETE mobile app with these files:
1. package.json - with all dependencies
2. app.json - Expo configuration
3. App.tsx - Main entry with navigation
4. src/navigation/AppNavigator.tsx - Stack/Tab navigation for all screens
5. src/screens/HomeScreen.tsx - Dashboard with domain-specific content
6. src/screens/[Screen]Screen.tsx - One file per screen listed above
7. src/services/api.ts - API client with endpoints for all tables
8. src/services/auth.ts - Authentication if enabled
9. src/components/Card.tsx - Reusable card component
10. src/components/LoadingSpinner.tsx - Loading indicator

Make the code DOMAIN-SPECIFIC for ${config.domain}. For example:
- Healthcare: Patient cards, appointment lists, prescription views
- Banking: Account balances, transaction lists, transfer forms
- AMI: Meter readings, consumption charts, outage alerts

Return ONLY valid JSON:
{
  "files": [
    {"path": "package.json", "content": "...", "description": "..."},
    {"path": "App.tsx", "content": "...", "description": "..."}
  ],
  "instructions": "How to run the app",
  "dependencies": {"expo": "~49.0.0", "...": "..."}
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating mobile app with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert React Native/Expo developer. Generate complete, production-ready mobile app code for the ${config.domain} domain.
Return ONLY valid JSON. No markdown, no explanation. Generate REAL code, not placeholders.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty Groq response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function groqGenerateBackendApi(config: {
  framework: string;
  domain: string;
  database: string;
  projectName: string;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>;
  authentication: boolean;
}): Promise<{ files: Array<{ path: string; content: string; description: string }>; instructions: string }> {
  const client = getClient();

  const tablesList = config.tables?.map(t => 
    `- ${t.name}: ${t.columns.map(c => `${c.name} (${c.type})`).join(', ')}`
  ).join('\n') || '';

  const frameworkDetails: Record<string, string> = {
    nodejs: 'Node.js with Express and TypeScript',
    python: 'Python with FastAPI',
    go: 'Go with Gin framework'
  };

  const prompt = `Generate a complete ${frameworkDetails[config.framework] || config.framework} backend API for a ${config.domain.toUpperCase()} application.

Project: ${config.projectName}
Database: ${config.database}
Authentication: ${config.authentication ? 'JWT-based' : 'None'}

DATABASE TABLES:
${tablesList}

Generate COMPLETE backend with:
1. Main server entry point
2. Database connection and models/schema
3. CRUD routes for EACH table
4. Authentication middleware (if enabled)
5. Error handling
6. Environment config
7. Dockerfile

For ${config.domain} domain, include domain-specific logic:
- Healthcare: HIPAA logging, patient data validation
- Banking: Transaction validation, balance checks
- AMI: Reading validation, consumption calculations

Return ONLY valid JSON:
{
  "files": [
    {"path": "src/index.ts", "content": "...", "description": "..."}
  ],
  "instructions": "How to run the server"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log("Generating backend API with Groq AI...");

    const response = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert ${config.framework} developer. Generate complete, production-ready backend API code.
Return ONLY valid JSON. No markdown. Generate REAL code with proper error handling.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty Groq response");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}
