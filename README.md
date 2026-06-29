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
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b
OLLAMA_VISION_MODEL=minimax-m3
```

3. Run the dev server:

```bash
npm run dev
```

## Vercel

Add the same environment variables in **Project Settings > Environment Variables**.

The API key is used only inside `app/api/chat/route.ts`, so it is not exposed to browser JavaScript.

Important: Vercel cannot reach `http://127.0.0.1:11434` on your computer. For production, set `OLLAMA_BASE_URL` to `https://ollama.com` or another public Ollama-compatible/OpenAI-compatible API endpoint.

For screenshot/image solving, `OLLAMA_VISION_MODEL` must be a model your Ollama key can access that supports image input. If the configured vision model is unavailable, the app now falls back to the coding model and explains that vision access needs setup instead of showing a fake connection outage.

Keep `OLLAMA_API_KEY` in Vercel environment variables only, never in frontend code or a public repository.
"# AI-coder" 
"# AI-coder" 
