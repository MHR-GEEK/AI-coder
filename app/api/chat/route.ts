import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
};

type ChatPayload = {
  messages?: ChatMessage[];
  image?: string | null;
};

const SYSTEM_PROMPT = `You are HARYX AI Coder, a human-friendly elite programming assistant.
You can help with architecture, implementation, debugging, algorithms, UI, AI engineering, prompts, deployment, and error analysis.
Give direct working solutions, explain tradeoffs briefly, and ask for missing details only when they are required.
When an image is provided, inspect it for code, terminal errors, UI bugs, diagrams, and visible context before answering.`;

const CONNECTION_HELP =
  "The AI backend is not connected yet. For Ollama cloud, set OLLAMA_BASE_URL=https://ollama.com and add OLLAMA_API_KEY. For local Ollama, run `ollama serve`, pull the configured model, and set OLLAMA_BASE_URL=http://127.0.0.1:11434.";

function cleanBase64Image(image?: string | null) {
  if (!image) return null;
  return image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function isLocalBaseUrl(baseUrl: string) {
  return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
}

function apiChatUrl(baseUrl: string) {
  if (baseUrl.endsWith("/api")) return `${baseUrl}/chat`;
  if (baseUrl.endsWith("/v1")) return `${baseUrl.replace(/\/v1$/, "")}/api/chat`;
  return `${baseUrl}/api/chat`;
}

function openAiChatUrl(baseUrl: string) {
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/chat/completions`;
  if (baseUrl.endsWith("/api")) return `${baseUrl.replace(/\/api$/, "")}/v1/chat/completions`;
  return `${baseUrl}/v1/chat/completions`;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    done: () => clearTimeout(timeout)
  };
}

function buildOpenAiMessages(messages: ChatMessage[], image?: string | null) {
  return messages.map((message, index) => {
    const isLastUserWithImage = image && message.role === "user" && index === messages.findLastIndex((item) => item.role === "user");

    if (!isLastUserWithImage) {
      return {
        role: message.role,
        content: message.content
      };
    }

    return {
      role: message.role,
      content: [
        { type: "text", text: message.content },
        { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } }
      ]
    };
  });
}

async function postJson(url: string, body: unknown, apiKey?: string) {
  const timeout = withTimeout(45000);

  try {
    return await fetch(url, {
      method: "POST",
      signal: timeout.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(body)
    });
  } finally {
    timeout.done();
  }
}

async function readFailure(response: Response) {
  const details = await response.text();
  return details.slice(0, 1200);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ChatPayload;
    const apiKey = process.env.OLLAMA_API_KEY;
    const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL || "https://ollama.com");
    const textModel = process.env.OLLAMA_MODEL || "gpt-oss:120b";
    const visionModel = process.env.OLLAMA_VISION_MODEL || "gpt-oss:120b";
    const image = cleanBase64Image(payload.image);

    if (!apiKey && !isLocalBaseUrl(baseUrl)) {
      return NextResponse.json(
        { error: "Missing OLLAMA_API_KEY. Add it to Vercel environment variables." },
        { status: 500 }
      );
    }

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(payload.messages || []).slice(-10)
    ];

    if (image) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        lastUser.images = [image];
      }
    }

    const nativeResponse = await postJson(
      apiChatUrl(baseUrl),
      {
        model: image ? visionModel : textModel,
        messages,
        stream: false,
        options: {
          temperature: 0.35,
          top_p: 0.9,
          num_ctx: 8192
        }
      },
      apiKey
    );

    if (nativeResponse.ok) {
      const data = await nativeResponse.json();
      return NextResponse.json({
        content: data?.message?.content || "I could not read a response from Ollama.",
        model: data?.model || (image ? visionModel : textModel)
      });
    }

    const nativeDetails = await readFailure(nativeResponse);
    const openAiResponse = await postJson(
      openAiChatUrl(baseUrl),
      {
        model: image ? visionModel : textModel,
        messages: buildOpenAiMessages(messages, image),
        temperature: 0.35
      },
      apiKey
    );

    if (openAiResponse.ok) {
      const data = await openAiResponse.json();
      return NextResponse.json({
        content: data?.choices?.[0]?.message?.content || "I could not read a response from the AI provider.",
        model: data?.model || (image ? visionModel : textModel)
      });
    }

    return NextResponse.json(
      {
        error: CONNECTION_HELP,
        details: `Native /api/chat failed with ${nativeResponse.status}: ${nativeDetails}. OpenAI-compatible /v1/chat/completions failed with ${openAiResponse.status}: ${await readFailure(openAiResponse)}`
      },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      {
        error: message === "fetch failed" || message.includes("aborted") ? CONNECTION_HELP : message,
        details: message
      },
      { status: 502 }
    );
  }
}
