export type LlmProvider = "llama31-70b" | "mistral" | "mixtral-8x7b" | "codellama-34b" | "mystic";
export type LlmGenerateArgs = { system:string; user:string; jsonOnly:boolean; temperature?:number; maxTokens?:number };
export type LlmGenerateResult = { text:string; provider:LlmProvider; model:string };
export interface LlmClient { provider:LlmProvider; generate(args:LlmGenerateArgs): Promise<LlmGenerateResult>; }
