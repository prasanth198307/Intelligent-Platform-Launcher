import { loadDomainPack } from "../steps/domainPackLoader.js";
export function mergeDomainPacksIntoSpec(spec: any) {
  const entities = [...(spec.dataModel?.entities || [])];
  const workflows = [...(spec.workflows || [])];
  const rules = [...(spec.rules || [])];
  const integrations = [...(spec.integrations || [])];

  for (const d of spec.app.domain) {
    const pack = loadDomainPack(d);
    for (const pe of (pack.entities || [])) if (!entities.find(e=>e.id===pe.id)) entities.push(pe);
    for (const pw of (pack.workflows || [])) if (!workflows.find(w=>w.workflowId===pw.workflowId)) workflows.push(pw);
    for (const pr of (pack.rules || [])) if (!rules.find(r=>r.ruleId===pr.ruleId && r.version===pr.version)) rules.push(pr);
    const conns = pack.connectors || {};
    for (const key of Object.keys(conns)) {
      if (!integrations.find((i:any)=>i.id===key)) integrations.push({ id:key, type:key, actions:(conns[key].actions||[]).map((n:string)=>({name:n})) });
    }
  }

  return { ...spec, dataModel: { ...spec.dataModel, entities }, workflows, rules, integrations };
}
