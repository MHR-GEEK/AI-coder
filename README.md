# HARYX AI Coder

A responsive Next.js AI coding workspace with streaming chat, code generation, debugging, image understanding, and file attachments.

## Default provider: NVIDIA NIM

HARYX AI uses NVIDIA's OpenAI-compatible API by default:

- Base URL: `https://integrate.api.nvidia.com/v1`
- Text model: `deepseek-ai/deepseek-v4-flash`
- Vision model: `nvidia/nemotron-3.5-super-vl-120b-a12b`
- Chat endpoint: `POST /v1/chat/completions`

Create an API key at [NVIDIA Build](https://build.nvidia.com/settings).

### Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_nvidia_api_key
AI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL=deepseek-ai/deepseek-v4-flash
AI_VISION_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
AI_TEMPERATURE=0.35
AI_MAX_TOKENS=4096
```

Set the key as a secret. Never commit a real API key to Git. Redeploy after changing production environment variables.

You can also enter a personal provider key in the in-app Settings panel. The key is stored in that browser's local storage and sent only to this app's server route when a request is made.

## Other supported providers

The provider settings also support Groq, Google Gemini, OpenRouter, OpenAI, Together AI, Ollama, and custom OpenAI-compatible endpoints. Provider credentials are kept separate; an old generic key is never reused as an NVIDIA key.

## Development

```bash
git clone https://github.com/MHR-GEEK/AI-coder.git
cd AI-coder
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the TypeScript check and production build:

```bash
npm run lint
npm run build
```

## Features

- Responsive desktop, tablet, and mobile layout
- Streaming AI chat with stop and regenerate controls
- Multiple conversations, folders, search, pinning, and favorites
- Code copy/download utilities and Markdown rendering
- Image uploads, screenshots, and text-file context
- Browser voice input where supported
- Provider connection testing and diagnostics

## Developer

Created by **HARYX**.

- GitHub: [MHR-GEEK](https://github.com/MHR-GEEK)
- Instagram: [@md_haris_raza_](https://www.instagram.com/md_haris_raza_/)
