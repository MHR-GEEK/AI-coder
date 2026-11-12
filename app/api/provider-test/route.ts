import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary private diagnostic used during deployment verification.
export async function GET() {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "minimaxai/minimax-m3.1-flash";
  if (!key) return NextResponse.json({ ok: false, error: "AI_API_KEY missing" }, { status: 500 });
  try {
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply exactly: HARYX AI ONLINE" }], max_tokens: 64, stream: false }),
      signal: AbortSignal.timeout(50000)
    });
    const raw = await r.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}
    if (!r.ok) return NextResponse.json({ ok: false, status: r.status, model, providerError: data?.error?.message || data?.error || raw.slice(0, 500) }, { status: 502 });
    return NextResponse.json({ ok: Boolean(data?.choices?.[0]?.message?.content), status: r.status, model, response: data?.choices?.[0]?.message?.content || "" });
  } catch (e) {
    return NextResponse.json({ ok: false, model, error: e instanceof Error ? e.message : "Request failed" }, { status: 502 });
  }
}
