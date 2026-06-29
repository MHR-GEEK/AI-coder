# AI Coder

Futuristic Ollama-powered coding assistant built with Next.js for Vercel.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
OLLAMA_API_KEY=your_key_here
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:32b
OLLAMA_VISION_MODEL=llava:latest
```

3. Run the dev server:

```bash
npm run dev
```

## Vercel

Add the same environment variables in **Project Settings > Environment Variables**.

The API key is used only inside `app/api/chat/route.ts`, so it is not exposed to browser JavaScript.

Important: Vercel cannot reach `http://127.0.0.1:11434` on your computer. For production, set `OLLAMA_BASE_URL` to a public hosted Ollama-compatible or OpenAI-compatible API endpoint. Keep `OLLAMA_API_KEY` in Vercel only, never in frontend code.
