import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
};

type UploadedFile = {
  name: string;
  type: string;
  size: number;
  content?: string;
};

type ChatPayload = {
  messages?: ChatMessage[];
  image?: string | null;
  images?: string[];
  files?: UploadedFile[];
};

const SYSTEM_PROMPT = `You are HARYX AI Coder, a human-friendly elite programming assistant.
You can help with architecture, implementation, debugging, algorithms, UI, AI engineering, prompts, deployment, and error analysis.
Give direct working solutions, explain tradeoffs briefly, and ask for missing details only when they are required.
When images or files are provided, inspect them for code, terminal errors, UI bugs, diagrams, visible context, stack traces, and design/API issues before answering.
Format coding answers with short sections: Explanation, Root Cause, Solution, Updated Code, and Next Recommendation. Explain first, then show code, then explain improvements. Avoid giant walls of text.`;

const CONNECTION_HELP =
  "The AI backend is not connected yet. For Ollama cloud, set OLLAMA_BASE_URL=https://ollama.com and add OLLAMA_API_KEY. For local Ollama, run `ollama serve`, pull the configured model, and set OLLAMA_BASE_URL=http://127.0.0.1:11434.";

const FALLBACK_OLLAMA_API_KEY = "636e1d145daa4dd38a62b0be2659e3d4.iIF70AWxlFMDl3cFGFk1vyRH";
const IMAGE_FALLBACK_NOTE =
  "The request included image attachments, but the configured vision model could not process them. I can still help from your written prompt and attached file metadata. To enable real screenshot reading on Vercel, set OLLAMA_VISION_MODEL to an Ollama model your key can access that supports images.";

function cleanBase64Image(image?: string | null) {
  if (!image) return null;
  return image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function cleanBase64Images(payload: ChatPayload) {
  const images = [...(payload.images || []), ...(payload.image ? [payload.image] : [])];
  return images.map((item) => cleanBase64Image(item)).filter((item): item is string => Boolean(item));
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

function buildOpenAiMessages(messages: ChatMessage[], images: string[]) {
  return messages.map((message, index) => {
    const isLastUserWithImage = images.length > 0 && message.role === "user" && index === messages.findLastIndex((item) => item.role === "user");

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
        ...images.map((image) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${image}` } }))
      ]
    };
  });
}

function formatFiles(files?: UploadedFile[]) {
  if (!files?.length) return "";

  return [
    "\n\nAttached files:",
    ...files.map((file, index) => {
      const header = `\n[File ${index + 1}: ${file.name} | ${file.type || "unknown"} | ${file.size} bytes]`;
      if (!file.content) return `${header}\nBinary or unsupported text extraction. Use the filename and user prompt for context.`;
      return `${header}\n${file.content.slice(0, 20000)}`;
    })
  ].join("\n");
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

function isVisionModelFailure(status: number, details: string) {
  const text = details.toLowerCase();
  return (
    [400, 403, 404, 422].includes(status) &&
    (text.includes("image") ||
      text.includes("vision") ||
      text.includes("model") ||
      text.includes("not found") ||
      text.includes("forbidden") ||
      text.includes("does not support"))
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ChatPayload;
    const apiKey = process.env.OLLAMA_API_KEY || FALLBACK_OLLAMA_API_KEY;
    const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL || "https://ollama.com");
    const textModel = process.env.OLLAMA_MODEL || "gpt-oss:120b";
    const visionModel = process.env.OLLAMA_VISION_MODEL || "minimax-m3";
    const images = cleanBase64Images(payload);

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

    const fileContext = formatFiles(payload.files);
    if (fileContext) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        lastUser.content = `${lastUser.content}${fileContext}`;
      }
    }

    if (images.length) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        lastUser.images = images;
        lastUser.content = `${lastUser.content}\n\n[User attached ${images.length} image${images.length === 1 ? "" : "s"} for visual analysis.]`;
      }
    }

    const nativeResponse = await postJson(
      apiChatUrl(baseUrl),
      {
        model: images.length ? visionModel : textModel,
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
        model: data?.model || (images.length ? visionModel : textModel)
      });
    }

    const nativeDetails = await readFailure(nativeResponse);
    const openAiResponse = await postJson(
      openAiChatUrl(baseUrl),
      {
        model: images.length ? visionModel : textModel,
        messages: buildOpenAiMessages(messages, images),
        temperature: 0.35
      },
      apiKey
    );

    if (openAiResponse.ok) {
      const data = await openAiResponse.json();
      return NextResponse.json({
        content: data?.choices?.[0]?.message?.content || "I could not read a response from the AI provider.",
        model: data?.model || (images.length ? visionModel : textModel)
      });
    }

    const openAiDetails = await readFailure(openAiResponse);
    if (images.length && (isVisionModelFailure(nativeResponse.status, nativeDetails) || isVisionModelFailure(openAiResponse.status, openAiDetails))) {
      const textOnlyMessages = messages.map((message) => {
        const { images: _images, ...rest } = message;
        return rest;
      });
      const lastUser = [...textOnlyMessages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        lastUser.content = `${lastUser.content}\n\n${IMAGE_FALLBACK_NOTE}`;
      }

      const textFallbackResponse = await postJson(
        apiChatUrl(baseUrl),
        {
          model: textModel,
          messages: textOnlyMessages,
          stream: false,
          options: {
            temperature: 0.35,
            top_p: 0.9,
            num_ctx: 8192
          }
        },
        apiKey
      );

      if (textFallbackResponse.ok) {
        const data = await textFallbackResponse.json();
        return NextResponse.json({
          content: `${IMAGE_FALLBACK_NOTE}\n\n${data?.message?.content || "Send the visible error text from the screenshot and I will debug it."}`,
          model: data?.model || textModel,
          warning: "vision-model-unavailable"
        });
      }
    }

    return NextResponse.json(
      {
        error: CONNECTION_HELP,
        details: `Native /api/chat failed with ${nativeResponse.status}: ${nativeDetails}. OpenAI-compatible /v1/chat/completions failed with ${openAiResponse.status}: ${openAiDetails}`
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
