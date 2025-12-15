import { Llama31_70B_Client } from "./providers/llama31_70b.js";
import { MistralClient, Mixtral8x7BClient } from "./providers/mistral.js";
import { CodeLlama34BClient } from "./providers/codellama34b.js";
import { MysticClient } from "./providers/mystic.js";

export function selectProvider(mode:"normal"|"enterprise") {
  const p = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (p === "llama31-70b" || p === "llama") return new Llama31_70B_Client();
  if (p === "mistral") return new MistralClient();
  if (p === "mixtral-8x7b" || p === "mixtral") return new Mixtral8x7BClient();
  if (p === "codellama-34b" || p === "codellama") return new CodeLlama34BClient();
  if (p === "mystic") return new MysticClient();
  return mode === "enterprise" ? new Llama31_70B_Client() : new Mixtral8x7BClient();
}
