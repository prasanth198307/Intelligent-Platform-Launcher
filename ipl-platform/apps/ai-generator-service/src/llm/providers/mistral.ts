import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class MistralClient implements LlmClient {
  provider = "mistral" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.MISTRAL_API_KEY; if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");
    const model = process.env.MISTRAL_MODEL || "mistral-large-latest";
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.2, max_tokens: args.maxTokens ?? 2000
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
export class Mixtral8x7BClient implements LlmClient {
  provider = "mixtral-8x7b" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const apiKey = process.env.MISTRAL_API_KEY; if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");
    const model = process.env.MIXTRAL_MODEL || "open-mixtral-8x7b";
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", { method:"POST",
      headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages:[{role:"system",content:args.system},{role:"user",content:args.user}],
        temperature: args.temperature ?? 0.2, max_tokens: args.maxTokens ?? 2000
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.choices?.[0]?.message?.content ?? "", provider:this.provider, model };
  }
}
