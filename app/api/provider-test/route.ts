import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary end-to-end test of the same streaming route used by the chat UI.
export async function GET() {
  try {
    const response = await fetch("https://aicoder-mhr.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply exactly: HARYX CHAT ROUTE ONLINE" }]
      }),
      signal: AbortSignal.timeout(55000)
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok && Boolean(text.trim()),
      status: response.status,
      model: process.env.AI_MODEL || "not configured",
      response: text.slice(0, 500)
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Chat route test failed"
    }, { status: 502 });
  }
}
