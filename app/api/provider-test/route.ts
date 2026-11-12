import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary server-side provider smoke test. Remove after verification.
export async function GET() {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "minimaxai/minimax-m3.1-flash";
  if (!key) return NextResponse.json({ ok: false, error: "AI_API_KEY missing" }, { status: 500 });
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply exactly: HARYX AI ONLINE" }],
        max_tokens: 64,
        stream: false
      }),
      signal: AbortSignal.timeout(50000)
    });
    const raw = await response.text();
    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string } = {};
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) return NextResponse.json({
      ok: false, status: response.status, model,
      providerError: typeof data.error === "string" ? data.error : data.error?.message || raw.slice(0, 700)
    }, { status: 502 });
    return NextResponse.json({
      ok: Boolean(data.choices?.[0]?.message?.content),
      status: response.status,
      model,
      response: data.choices?.[0]?.message?.content || ""
    });
  } catch (error) {
    return NextResponse.json({ ok: false, model, error: error instanceof Error ? error.message : "Provider test failed" }, { status: 502 });
  }
}
