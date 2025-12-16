import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DomainPack {
  domain: string;
  name: string;
  description: string;
  terminology: Record<string, any>;
  entities: Record<string, any>;
  modules: Record<string, any>;
  scale_profiles: Record<string, any>;
  infrastructure_recommendations: Record<string, any>;
}

const domainPackCache: Record<string, DomainPack> = {};

export function loadDomainPack(domain: string): DomainPack | null {
  if (domainPackCache[domain]) {
    return domainPackCache[domain];
  }

  const paths = [
    path.join(process.cwd(), "domain-packs", `${domain}.json`),
    path.join(process.cwd(), "src", "domain-packs", `${domain}.json`),
    path.join(__dirname, "..", "..", "domain-packs", `${domain}.json`),
    path.join(process.cwd(), "domain-packs", domain, "pack.json"),
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const pack = JSON.parse(fs.readFileSync(p, "utf-8"));
        domainPackCache[domain] = pack;
        console.log(`Loaded domain pack for ${domain} from ${p}`);
        return pack;
      } catch (e) {
        console.error(`Failed to parse domain pack at ${p}:`, e);
      }
    }
  }

  console.log(`No domain pack found for ${domain}`);
  return null;
}

export function getDomainContext(domain: string, userIntent: string): string {
  const pack = loadDomainPack(domain);
  if (!pack) {
    return "";
  }

  const intentLower = userIntent.toLowerCase();
  let context = `\n\n## Domain Context: ${pack.name}\n`;
  context += `${pack.description}\n\n`;

  // Check terminology matches
  if (pack.terminology) {
    context += "### Domain Terminology:\n";
    for (const [key, term] of Object.entries(pack.terminology)) {
      const termData = term as any;
      const aliases = termData.aliases || [];
      const allNames = [key, ...aliases].map((n: string) => n.toLowerCase());
      
      if (allNames.some(name => intentLower.includes(name.replace(/_/g, ' ')) || intentLower.includes(name))) {
        context += `- **${key}**: ${termData.description}\n`;
        if (termData.components) {
          context += `  Components: ${termData.components.join(', ')}\n`;
        }
      }
    }
  }

  // Find matching module
  let matchedModule: any = null;
  if (pack.modules) {
    for (const [key, mod] of Object.entries(pack.modules)) {
      const modData = mod as any;
      const modName = modData.name?.toLowerCase() || key.toLowerCase();
      if (intentLower.includes(modName) || intentLower.includes(key.replace(/_/g, ' '))) {
        matchedModule = { key, ...modData };
        break;
      }
    }
  }

  if (matchedModule) {
    context += `\n### Matched Module: ${matchedModule.name}\n`;
    context += `${matchedModule.description}\n`;
    context += `\nEntities to create:\n`;
    for (const entityName of matchedModule.entities || []) {
      const entity = pack.entities?.[entityName];
      if (entity) {
        context += `\n#### Table: ${entityName}\n`;
        context += `${entity.description}\n`;
        context += "Columns:\n";
        for (const field of entity.fields || []) {
          let colDef = `- ${field.name}: ${field.type}`;
          if (field.primaryKey) colDef += " (PK)";
          if (field.references) colDef += ` -> ${field.references}`;
          if (field.enum) colDef += ` [${field.enum.join(', ')}]`;
          context += colDef + "\n";
        }
      }
    }

    context += `\nAPIs to create:\n`;
    for (const api of matchedModule.apis || []) {
      context += `- ${api.method} ${api.path}: ${api.description}\n`;
    }

    context += `\nScreens to create:\n`;
    for (const screen of matchedModule.screens || []) {
      context += `- ${screen.name} (${screen.type}) at ${screen.route}\n`;
    }
  }

  return context;
}

export function getModuleSpec(domain: string, moduleName: string): any {
  const pack = loadDomainPack(domain);
  if (!pack || !pack.modules) return null;

  const nameKey = moduleName.toLowerCase().replace(/\s+/g, '_');
  for (const [key, mod] of Object.entries(pack.modules)) {
    if (key === nameKey || (mod as any).name?.toLowerCase() === moduleName.toLowerCase()) {
      return {
        key,
        ...mod as any,
        entities: ((mod as any).entities || []).map((eName: string) => ({
          name: eName,
          ...pack.entities?.[eName]
        }))
      };
    }
  }
  return null;
}

export function getAllModulesForDomain(domain: string): any[] {
  const pack = loadDomainPack(domain);
  if (!pack || !pack.modules) return [];

  return Object.entries(pack.modules).map(([key, mod]) => ({
    key,
    ...(mod as any)
  }));
}
