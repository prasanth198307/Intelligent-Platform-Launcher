import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class CodeLlama34BClient implements LlmClient {
  provider = "codellama-34b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const baseUrl = process.env.CODELLAMA_BASE_URL; if (!baseUrl) throw new Error("Missing CODELLAMA_BASE_URL");
    const apiKey = process.env.CODELLAMA_API_KEY;
    const model = process.env.CODELLAMA_MODEL || "codellama-34b-instruct";
    const headers:any = { "Content-Type":"application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(`${baseUrl}/v1/chat/completions`, { method:"POST", headers,
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.1, max_tokens: args.maxTokens ?? 2500
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
