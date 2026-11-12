import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary protected-preview smoke test. Remove after the provider is verified.
export async function GET(request: Request) {
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.AI_MODEL || "glm-5.3-flash:cloud";
  if (!apiKey) return NextResponse.json({ ok: false, reason: "OLLAMA_API_KEY is missing" }, { status: 500 });

  try {
  if (new URL(request.url).searchParams.get("catalog") === "1") {
    const catalog = await fetch("https://ollama.com/api/tags", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000)
    });
    const catalogText = await catalog.text();
    if (!catalog.ok) return NextResponse.json({ ok: false, status: catalog.status, details: catalogText.slice(0, 1000) }, { status: 502 });
    const catalogData = JSON.parse(catalogText);
    return NextResponse.json({
      ok: true,
      models: (catalogData.models || [])
        .map((item: { name?: string; model?: string }) => item.name || item.model)
        .filter((name: string | undefined) => name && /puwaer|qwen3|glm-5\.3-flash/i.test(name))
    });
  }

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
