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

type ProviderConfig = {
  provider: "ollama" | "openai-compatible";
  baseUrl: string;
  apiKey?: string;
  textModel: string;
  visionModel: string;
  missing: string[];
};

const SYSTEM_PROMPT = `You are HARYX AI Coder, a human-friendly elite programming assistant.
You can help with architecture, implementation, debugging, algorithms, UI, AI engineering, prompts, deployment, and error analysis.
Give direct working solutions, explain tradeoffs briefly, and ask for missing details only when they are required.
When images or files are provided, inspect them for code, terminal errors, UI bugs, diagrams, visible context, stack traces, and design/API issues before answering.
Format coding answers with short sections: Explanation, Root Cause, Solution, Updated Code, and Next Recommendation. Explain first, then show code, then explain improvements. Avoid giant walls of text.`;

const CONNECTION_HELP =
  "The AI backend is not connected yet. Configure AI_PROVIDER, AI_BASE_URL, AI_API_KEY, and AI_MODEL in your local or Vercel environment. For local Ollama, run `ollama serve` and set AI_PROVIDER=ollama with AI_BASE_URL=http://127.0.0.1:11434.";

const IMAGE_FALLBACK_NOTE =
  "The request included image attachments, but the configured vision model could not process them. I can still help from your written prompt and attached file metadata. To enable real screenshot reading, set AI_VISION_MODEL to a model your provider can access that supports images.";

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

function getProviderConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || process.env.OLLAMA_PROVIDER || "ollama").toLowerCase();
  const baseUrl = normalizeBaseUrl(
    process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.OLLAMA_BASE_URL ||
      (provider === "openai" ? "https://api.openai.com/v1" : "https://ollama.com")
  );
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.OLLAMA_API_KEY;
  const textModel =
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.OLLAMA_MODEL ||
    (provider === "openai" ? "gpt-4.1-mini" : "gpt-oss:120b");
  const visionModel = process.env.AI_VISION_MODEL || process.env.OPENAI_VISION_MODEL || process.env.OLLAMA_VISION_MODEL || textModel;
  const normalizedProvider = provider === "openai" || provider === "openai-compatible" ? "openai-compatible" : "ollama";
  const missing: string[] = [];

  if (!baseUrl) missing.push("AI_BASE_URL");
  if (!textModel) missing.push("AI_MODEL");
  if (!apiKey && !isLocalBaseUrl(baseUrl)) missing.push("AI_API_KEY");

  return {
    provider: normalizedProvider,
    baseUrl,
    apiKey,
    textModel,
    visionModel,
    missing
  };
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

async function postJsonWithRetry(url: string, body: unknown, apiKey?: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await postJson(url, body, apiKey);
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  throw lastError;
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
    const config = getProviderConfig();
    const images = cleanBase64Images(payload);

    if (config.missing.length) {
      return NextResponse.json(
        {
          error: `Missing AI configuration: ${config.missing.join(", ")}.`,
          details: CONNECTION_HELP,
          missing: config.missing
        },
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

    const ollamaBody = {
      model: images.length ? config.visionModel : config.textModel,
      messages,
      stream: false,
      options: {
        temperature: 0.35,
        top_p: 0.9,
        num_ctx: 8192
      }
    };
    const openAiBody = {
      model: images.length ? config.visionModel : config.textModel,
      messages: buildOpenAiMessages(messages, images),
      temperature: 0.35
    };

    const primaryResponse = await postJsonWithRetry(
      config.provider === "ollama" ? apiChatUrl(config.baseUrl) : openAiChatUrl(config.baseUrl),
      config.provider === "ollama" ? ollamaBody : openAiBody,
      config.apiKey
    );

    if (primaryResponse.ok) {
      const data = await primaryResponse.json();
      return NextResponse.json({
        content:
          config.provider === "ollama"
            ? data?.message?.content || "I could not read a response from Ollama."
            : data?.choices?.[0]?.message?.content || "I could not read a response from the AI provider.",
        model: data?.model || (images.length ? config.visionModel : config.textModel)
      });
    }

    const primaryDetails = await readFailure(primaryResponse);
    const fallbackUrl = config.provider === "ollama" ? openAiChatUrl(config.baseUrl) : apiChatUrl(config.baseUrl);
    const fallbackBody = config.provider === "ollama" ? openAiBody : ollamaBody;
    const fallbackResponse = await postJsonWithRetry(fallbackUrl, fallbackBody, config.apiKey);

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      return NextResponse.json({
        content:
          config.provider === "ollama"
            ? data?.choices?.[0]?.message?.content || "I could not read a response from the AI provider."
            : data?.message?.content || "I could not read a response from Ollama.",
        model: data?.model || (images.length ? config.visionModel : config.textModel)
      });
    }

    const fallbackDetails = await readFailure(fallbackResponse);

    if (images.length && (isVisionModelFailure(primaryResponse.status, primaryDetails) || isVisionModelFailure(fallbackResponse.status, fallbackDetails))) {
      const textOnlyMessages = messages.map((message) => {
        const { images: _images, ...rest } = message;
        void _images;
        return rest;
      });
      const lastUser = [...textOnlyMessages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        lastUser.content = `${lastUser.content}\n\n${IMAGE_FALLBACK_NOTE}`;
      }

      const textFallbackBody =
        config.provider === "ollama"
          ? {
              model: config.textModel,
              messages: textOnlyMessages,
              stream: false,
              options: {
                temperature: 0.35,
                top_p: 0.9,
                num_ctx: 8192
              }
            }
          : {
              model: config.textModel,
              messages: textOnlyMessages,
              temperature: 0.35
            };

      const textFallbackResponse = await postJsonWithRetry(
        config.provider === "ollama" ? apiChatUrl(config.baseUrl) : openAiChatUrl(config.baseUrl),
        textFallbackBody,
        config.apiKey
      );

      if (textFallbackResponse.ok) {
        const data = await textFallbackResponse.json();
        const content =
          config.provider === "ollama"
            ? data?.message?.content
            : data?.choices?.[0]?.message?.content;
        return NextResponse.json({
          content: `${IMAGE_FALLBACK_NOTE}\n\n${content || "Send the visible error text from the screenshot and I will debug it."}`,
          model: data?.model || config.textModel,
          warning: "vision-model-unavailable"
        });
      }
    }

    return NextResponse.json(
      {
        error: CONNECTION_HELP,
        details: `Primary provider request failed with ${primaryResponse.status}: ${primaryDetails}. Fallback request failed with ${fallbackResponse.status}: ${fallbackDetails}`
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
