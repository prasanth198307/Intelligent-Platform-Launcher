import { mockLLM, mockLLMForType } from "./providers/mock.js";
import { openaiLLM, openaiLLMForType } from "./providers/openai.js";

export interface GenerationContext {
  domain: string;
  entityCount: number;
  transactionsPerDay: number;
  database: string;
  compliance: string[];
  deploymentType: string;
}

export async function runLLM(prompt: string) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log("LLM provider:", provider);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await openaiLLM(prompt);
    }

    return await mockLLM(prompt);
  } catch (err) {
    console.error("LLM failed, falling back to mock:", err);
    return mockLLM(prompt);
  }
}

export async function runLLMForType(type: string, context: GenerationContext) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log(`LLM provider: ${provider}, type: ${type}`);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await openaiLLMForType(type, context);
    }

    return await mockLLMForType(type, context);
  } catch (err) {
    console.error("LLM failed, falling back to mock:", err);
    return mockLLMForType(type, context);
  }
}
