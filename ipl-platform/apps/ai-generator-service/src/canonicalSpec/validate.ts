import { CanonicalSpecSchema } from "./schema.js";
export function validateCanonicalSpec(raw: unknown) {
  const parsed = CanonicalSpecSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues };
  const spec: any = parsed.data;
  const issues: any[] = [];
  for (const e of (spec.dataModel?.entities || [])) {
    const fields = e.fields || [];
    const hasTenant = fields.find((f:any)=>f.name==="tenant_id");
    if (!hasTenant) issues.push({ code:"TENANT_FIELD", message:`Entity ${e.id} missing tenant_id` });
  }
  if (issues.length) return { ok: false as const, issues };
  return { ok: true as const, spec };
}
