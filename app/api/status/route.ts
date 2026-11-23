import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Provider = "nvidia" | "gemini" | "ollama" | "openai" | "openrouter" | "groq" | "together" | "openai-compatible";

const PROVIDERS: Record<Provider, { key: string; baseUrl: string; model: string; visionModel: string }> = {
  nvidia: {
    key: "NVIDIA_API_KEY",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek-ai/deepseek-v4-flash",
    visionModel: "nvidia/nemotron-3.5-super-vl-120b-a12b"
  },
  gemini: {
    key: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    visionModel: "gemini-2.5-flash"
  },
  ollama: { key: "OLLAMA_API_KEY", baseUrl: "https://ollama.com", model: "gpt-oss:120b", visionModel: "qwen3-vl:235b-cloud" },
  openai: { key: "OPENAI_API_KEY", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", visionModel: "gpt-4.1" },
  openrouter: { key: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1-mini", visionModel: "openai/gpt-4.1" },
  groq: { key: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", visionModel: "meta-llama/llama-4-scout-17b-16e-instruct" },
  together: { key: "TOGETHER_API_KEY", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", visionModel: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo" },
  "openai-compatible": { key: "AI_API_KEY", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", visionModel: "gpt-4.1" }
};

function providerFromEnv(): Provider {
  const raw = (process.env.AI_PROVIDER || "nvidia").toLowerCase().trim();
  if (raw in PROVIDERS) return raw as Provider;
  return "nvidia";
}

function isLocalOllama(baseUrl: string) {
  return /localhost|127\\.0\\.0\\.1|::1/i.test(baseUrl);
}

export async function GET() {
  const started = Date.now();
  const provider = providerFromEnv();
  const defaults = PROVIDERS[provider];
  const prefix = provider.toUpperCase().replace(/-/g, "_");
  const baseUrl = process.env.AI_BASE_URL || process.env[`${prefix}_BASE_URL`] || defaults.baseUrl;
  const model = process.env.AI_MODEL || process.env[`${prefix}_MODEL`] || defaults.model;
  const visionModel = process.env.AI_VISION_MODEL || process.env[`${prefix}_VISION_MODEL`] || defaults.visionModel;
  const hasApiKey = Boolean(process.env[defaults.key] || process.env.AI_API_KEY);
  const missing = !hasApiKey && !(provider === "ollama" && isLocalOllama(baseUrl)) ? [defaults.key] : [];
  const configured = missing.length === 0;

  console.info("[HARYX AI] status route", {
    provider, baseUrl, model, visionModel, hasApiKey, missing,
    deployment: process.env.VERCEL ? "vercel" : process.env.NODE_ENV || "local"
  });

  return NextResponse.json({
    provider,
    currentModel: model,
    visionModel,
    apiStatus: configured ? "configured" : "missing-configuration",
    configured,
    responseTime: Date.now() - started,
    missing,
    requiredKey: defaults.key,
    hasApiKey,
    baseUrl,
    buildVersion: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    deploymentEnvironment: process.env.VERCEL ? "vercel" : process.env.NODE_ENV || "local",
    lastRequest: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  });
}
