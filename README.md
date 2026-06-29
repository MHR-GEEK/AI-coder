# HARYX AI Coder

Futuristic AI coding assistant built with Next.js for Vercel. Supports Ollama and OpenAI-compatible hosted providers.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
AI_PROVIDER=ollama
AI_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_key
AI_MODEL=gpt-oss:120b
AI_VISION_MODEL=minimax-m3
```

For local Ollama, use your local server and no API key:

```bash
AI_PROVIDER=ollama
AI_BASE_URL=http://127.0.0.1:11434
AI_MODEL=llama3.1
```

3. Run the dev server:

```bash
npm run dev
```

## Vercel

Add the provider variables in **Project Settings > Environment Variables**, then redeploy.

Supported providers:

| Provider | AI_PROVIDER | Required key |
| --- | --- | --- |
| Ollama Cloud | `ollama` | `OLLAMA_API_KEY` |
| Local Ollama | `ollama` | none when `AI_BASE_URL=http://127.0.0.1:11434` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Groq | `groq` | `GROQ_API_KEY` |
| Together AI | `together` | `TOGETHER_API_KEY` |
| Other OpenAI-compatible APIs | `openai-compatible` | `AI_API_KEY` |

Do not set `AI_API_KEY` for Ollama, OpenRouter, Groq, or Together unless you intentionally want to use it as a generic fallback. The backend validates the provider-specific key first, so a Vercel Ollama deployment should use `OLLAMA_API_KEY`, not `AI_API_KEY`.

Provider keys are used only inside `app/api/chat/route.ts`, so they are not exposed to browser JavaScript.

Important: Vercel cannot reach `http://127.0.0.1:11434` on your computer. For production, set `AI_BASE_URL` to `https://ollama.com` or another public Ollama-compatible/OpenAI-compatible API endpoint.

For screenshot/image solving, `AI_VISION_MODEL` must be a model your provider key can access that supports image input. If the configured vision model is unavailable, the app falls back to the coding model and explains that vision access needs setup instead of showing a generic connection outage.

Keep provider API keys in Vercel environment variables only, never in frontend code or a public repository.

## Status Check

`GET /api/status` returns a safe status snapshot with provider, model, deployment environment, missing variables, response configuration, and memory usage. `GET /api/chat` returns the same chat-service status for compatibility. Neither endpoint returns API key values.
