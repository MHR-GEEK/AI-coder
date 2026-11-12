import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary preview-only diagnostic. Delete after model access is verified.
export async function GET() {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) return NextResponse.json({ error: "OLLAMA_API_KEY missing" }, { status: 500 });

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const catalogResponse = await fetch("https://ollama.com/api/tags", {
    headers,
    signal: AbortSignal.timeout(15000)
  });
  const catalogText = await catalogResponse.text();
  if (!catalogResponse.ok) {
    return NextResponse.json({ error: "Catalog request failed", status: catalogResponse.status, details: catalogText.slice(0, 500) }, { status: 502 });
  }

  const catalog = JSON.parse(catalogText);
  const listed = (catalog.models || []).map((m: { name?: string; model?: string }) => m.name || m.model).filter(Boolean);
  const candidates = Array.from(new Set([...listed, "gpt-oss:120b", "glm-5.3-flash:cloud"]));
  const results = [];

  for (const model of candidates) {
    try {
      const response = await fetch("https://ollama.com/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply exactly: HARYX MODEL TEST OK" }],
          stream: false
        }),
        signal: AbortSignal.timeout(45000)
      });
      const raw = await response.text();
      let parsed: { message?: { content?: string }; error?: string } = {};
      try { parsed = JSON.parse(raw); } catch {}
      results.push({
        model,
        status: response.status,
        ok: response.ok,
        response: parsed.message?.content?.slice(0, 100) || null,
        error: parsed.error?.slice(0, 500) || (!response.ok ? raw.slice(0, 500) : null)
      });
    } catch (error) {
      results.push({ model, ok: false, error: error instanceof Error ? error.message : "Request failed" });
    }
  }

  return NextResponse.json({ catalogModels: listed, results });
}
