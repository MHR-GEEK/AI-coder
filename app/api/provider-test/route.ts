import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary smoke test for the configured NVIDIA inference endpoint.
// Returns only the model reply and status; never returns credentials.
export async function GET() {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "minimaxai/minimax-m3.1-flash";
  if (!apiKey) return NextResponse.json({ ok: false, error: "AI_API_KEY missing" }, { status: 500 });
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply exactly: HARYX AI ONLINE" }],
        max_tokens: 64,
        temperature: 1,
        top_p: 0.95,
        stream: false
      }),
      signal: AbortSignal.timeout(50000)
    });
    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) return NextResponse.json({
      ok: false, status: response.status, model,
      providerError: data?.error?.message || data?.error || raw.slice(0, 500)
    }, { status: 502 });
    return NextResponse.json({
      ok: Boolean(data?.choices?.[0]?.message?.content),
      status: response.status,
      model,
      response: data?.choices?.[0]?.message?.content || ""
    });
  } catch (error) {
    return NextResponse.json({ ok: false, model, error: error instanceof Error ? error.message : "Request failed" }, { status: 502 });
  }
}
