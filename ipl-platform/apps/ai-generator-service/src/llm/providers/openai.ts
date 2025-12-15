import OpenAI from "openai";

export async function openaiLLM(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.LLM_TIMEOUT_MS || 20000)
  );

  try {
    console.log("OpenAI LLM invoked");

    const response = await client.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are an enterprise application architect.
Return ONLY valid JSON.
No explanation.
`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      },
      { signal: controller.signal }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty OpenAI response");

    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}
