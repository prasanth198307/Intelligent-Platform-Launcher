import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class Llama31_70B_Client implements LlmClient {
  provider = "llama31-70b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.LLAMA_API_KEY; if (!apiKey) throw new Error("Missing LLAMA_API_KEY");
    const baseUrl = process.env.LLAMA_BASE_URL || "https://api.llama.com";
    const model = process.env.LLAMA_MODEL || "llama-3.1-70b-instruct";
    const r = await fetch(`${baseUrl}/v1/chat/completions`, { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.1, max_tokens: args.maxTokens ?? 2000,
        response_format: args.jsonOnly ? { type:"json_object" } : undefined
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
