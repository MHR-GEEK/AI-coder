import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary protected-preview smoke test. Remove after the provider is verified.
export async function GET() {
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.AI_MODEL || "ttempvnn/Puwaer-Qwen3-Next-80B-A3B-Thinking-SFT-Uncensored-04-Q-K-M";
  if (!apiKey) return NextResponse.json({ ok: false, reason: "OLLAMA_API_KEY is missing" }, { status: 500 });

  try {
    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: HARYX AI ONLINE" }],
        stream: false
      }),
      signal: AbortSignal.timeout(50000)
    });
    const raw = await response.text();
    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        status: response.status,
        model,
        providerDetails: raw.slice(0, 1200)
      }, { status: 502 });
    }
    const data = JSON.parse(raw);
    return NextResponse.json({
      ok: Boolean(data?.message?.content),
      status: response.status,
      model: data?.model || model,
      response: data?.message?.content || "",
      done: data?.done ?? null
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      model,
      error: error instanceof Error ? error.message : "Provider smoke test failed"
    }, { status: 502 });
  }
}
