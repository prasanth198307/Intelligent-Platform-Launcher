import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from "./types.js";
export class MysticClient implements LlmClient {
  provider = "mystic" as const;
  async generate(args: LlmGenerateArgs): Promise<LlmGenerateResult> {
    const url = process.env.MYSTIC_ENDPOINT_URL; if (!url) throw new Error("Missing MYSTIC_ENDPOINT_URL");
    const apiKey = process.env.MYSTIC_API_KEY;
    const model = process.env.MYSTIC_MODEL || "custom";
    const headers:any = { "Content-Type":"application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const r = await fetch(url, { method:"POST", headers,
      body: JSON.stringify({ prompt: `${args.system}\n\nUSER:\n${args.user}\n\nOUTPUT:`, json_only: args.jsonOnly })
    });
    if (!r.ok) throw new Error(await r.text());
    const data:any = await r.json();
    return { text: data?.text ?? data?.output ?? data?.result ?? "", provider:this.provider, model };
  }
}
