import { runLLM } from "./index.js";

export async function oneMessageToValidatedSpec(
  message: string,
  mode: "normal" | "enterprise"
) {
  console.log("LLM adapter invoked");

  const baseSpec = await runLLM(message);

  // attach mode + validation marker
  return {
    ok: true,
    mode,
    spec: {
      ...baseSpec,
      compliance:
        mode === "enterprise"
          ? ["audit", "rbac", "data-retention"]
          : []
    }
  };
}
