import fs from "fs";
import path from "path";
export function loadDomainPack(domain: string): any {
  const p = path.join(process.cwd(), "domain-packs", domain, "pack.json");
  if (!fs.existsSync(p)) return { entities: [], workflows: [], rules: [], connectors: {} };
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
