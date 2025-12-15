import { mockLLM } from "./providers/mock.js";
import { openaiLLM } from "./providers/openai.js";

export async function runLLM(prompt: string) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log("LLM provider:", provider);

  try {
    if (provider === "openai") {
      return await openaiLLM(prompt);
    }

    return await mockLLM(prompt);
  } catch (err) {
    console.error("LLM failed, falling back to mock:", err);
    return mockLLM(prompt);
  }
}
