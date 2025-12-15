import { mockLLM, mockLLMForType } from "./providers/mock.js";
import { openaiLLM, openaiLLMForType } from "./providers/openai.js";
import { groqLLM, groqLLMForType } from "./providers/groq.js";
import { generateApplicationCode, reviewCode, fixCode, explainCode } from "./providers/openai-extended.js";
import { mockGenerateApplicationCode, mockReviewCode, mockFixCode, mockExplainCode } from "./providers/mock-extended.js";

export interface GenerationContext {
  domain: string;
  entityCount: number;
  transactionsPerDay: number;
  database: string;
  compliance: string[];
  deploymentType: string;
  requirements?: string;
  multiTenant?: {
    enabled: boolean;
    level: string;
  };
  multiLingual?: {
    enabled: boolean;
    level: string;
    languages: string[];
  };
}

export interface CodeGenerationRequest {
  context: GenerationContext;
  modules?: { name: string; description: string }[];
  screens?: { name: string; type: string }[];
  tables?: { name: string; columns: { name: string; type: string }[] }[];
  framework?: string;
  language?: string;
}

export async function runLLM(prompt: string) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log("LLM provider:", provider);

  try {
    if (provider === "groq" && process.env.GROQ_API_KEY) {
      return await groqLLM(prompt);
    }
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
    if (provider === "groq" && process.env.GROQ_API_KEY) {
      return await groqLLMForType(type, context);
    }
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await openaiLLMForType(type, context);
    }

    return await mockLLMForType(type, context);
  } catch (err) {
    console.error("LLM failed, falling back to mock:", err);
    return mockLLMForType(type, context);
  }
}

export async function runGenerateCode(request: CodeGenerationRequest) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log(`Generating code with provider: ${provider}`);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await generateApplicationCode(request);
    }
    return await mockGenerateApplicationCode(request);
  } catch (err) {
    console.error("Code generation failed, falling back to mock:", err);
    return mockGenerateApplicationCode(request);
  }
}

export async function runReviewCode(code: string, language: string, context?: string) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log(`Reviewing code with provider: ${provider}`);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await reviewCode({ code, language, context });
    }
    return await mockReviewCode(code, language);
  } catch (err) {
    console.error("Code review failed, falling back to mock:", err);
    return mockReviewCode(code, language);
  }
}

export async function runFixCode(code: string, language: string, issues: string[]) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log(`Fixing code with provider: ${provider}`);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await fixCode({ code, language, issues });
    }
    return await mockFixCode(code, issues);
  } catch (err) {
    console.error("Code fix failed, falling back to mock:", err);
    return mockFixCode(code, issues);
  }
}

export async function runExplainCode(code: string, language: string) {
  const provider = process.env.LLM_PROVIDER || "mock";
  console.log(`Explaining code with provider: ${provider}`);

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return await explainCode(code, language);
    }
    return await mockExplainCode(code, language);
  } catch (err) {
    console.error("Code explanation failed, falling back to mock:", err);
    return mockExplainCode(code, language);
  }
}
