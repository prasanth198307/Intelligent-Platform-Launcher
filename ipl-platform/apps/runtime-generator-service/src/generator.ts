import fs from "fs";
import path from "path";
import os from "os";
import { generateBackend } from "./backend/express.js";
import { generateFrontend } from "./frontend/react.js";
import { zipFolder } from "./zip.js";

export async function generateRuntime(spec: any) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ipl-"));
  const out = path.join(base, "generated");

  generateBackend(spec, path.join(out, "backend"));
  generateFrontend(spec, path.join(out, "frontend"));

  const zip = `${out}.zip`;
  await zipFolder(out, zip);

  return { ok: true, zip };
}
