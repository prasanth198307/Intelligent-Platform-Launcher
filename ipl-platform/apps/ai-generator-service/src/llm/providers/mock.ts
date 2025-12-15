export async function mockLLM(prompt: string) {
  console.log("Mock LLM invoked");

  return {
    app: {
      name: "Generated App",
      domains: inferDomain(prompt),
      channels: ["web"]
    },
    dataModel: {
      entities: ["User", "Order", "Asset"]
    },
    workflows: ["Create", "Update", "Audit"],
    deployment: {
      backend: "Node.js",
      frontend: "React",
      database: "PostgreSQL"
    }
  };
}

function inferDomain(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("manufacturing")) return ["manufacturing"];
  if (p.includes("health")) return ["healthcare"];
  if (p.includes("insurance")) return ["insurance"];
  if (p.includes("billing") || p.includes("ami")) return ["ami", "cis"];
  return ["generic"];
}
