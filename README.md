<div align="center">

# HARYX AI Coder

### Advanced AI Coding Workspace & Assistant

Built with precision by **HARYX**.

<br>

<img src="https://img.shields.io/badge/Groq-Ultra--Fast-orange?style=flat-square">
<img src="https://img.shields.io/badge/Gemini-Multimodal-blue?style=flat-square">
<img src="https://img.shields.io/badge/Ollama-Local-black?style=flat-square">
<img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs">
<img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript">
<img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?style=flat-square&logo=tailwindcss">
<img src="https://img.shields.io/badge/Vercel-Ready-black?style=flat-square&logo=vercel">

</div>

---

## Overview

**HARYX AI Coder** is a modern, responsive developer workspace and programming assistant. It supports cloud AI providers (Groq, Google Gemini, OpenRouter, OpenAI, Together) as well as local Ollama instances.

Designed for high-speed streaming conversations, code generation, instant debugging, screenshot & image understanding, file parsing, and project workspaces.

---

## Key Features

- **Multi-Provider Cloud & Local Support**:
  - **Groq** (⚡ Recommended for Vercel — Ultra fast & free tier)
  - **Google Gemini** (🌟 Multimodal vision & generous free tier)
  - **OpenRouter** (🌐 Free and commercial OSS models)
  - **OpenAI** (🤖 GPT-4o-mini, GPT-4o)
  - **Together AI** (🚀 Fast open-source LLMs)
  - **Ollama** (💻 Local inference or remote tunnels)
  - **Custom OpenAI-Compatible** endpoints
- **In-App AI Settings Modal**: Configure API keys, models, and endpoints directly in the browser with live connection testing.
- **100% Fully Responsive**: Works across mobile phones, tablets, and desktop displays with an off-canvas drawer navigation.
- **Smooth Streaming Response**: Optimized token streaming with throttled UI updates and zero-lag rendering.
- **Multimodal & File Uploads**: Image vision analysis (screenshots, UI bugs) and text file context injection (.ts, .js, .py, .json, .md, etc.).
- **Code Utilities**: Syntax highlighting, 1-click code copying, code downloading, and markdown chat export.

---

## Deploying to Vercel

### Step 1: Deploy
Push this repository to GitHub and import it into [Vercel](https://vercel.com).

### Step 2: Configure Environment Variables
In your **Vercel Project Settings > Environment Variables**, add one of the following:

#### Option A: Groq (Recommended - Free & Fast)
1. Get a free API key at [console.groq.com/keys](https://console.groq.com/keys).
2. Add to Vercel:
   ```env
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_your_groq_api_key_here
   AI_MODEL=llama-3.3-70b-versatile
   AI_VISION_MODEL=llama-3.2-11b-vision-preview
   ```

#### Option B: Google Gemini (Free Tier)
1. Get a free API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Add to Vercel:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AIzaSy_your_gemini_key_here
   AI_MODEL=gemini-2.0-flash
   AI_VISION_MODEL=gemini-2.0-flash
   ```

#### Option C: Client-Side Keys (No Env Vars Needed)
Even if you do not set environment variables in Vercel, users can click the **Settings (⚙️)** icon in the header, select their provider, and paste their API key.

---

## Local Development

```bash
git clone https://github.com/MHR-GEEK/AI-coder.git
cd AI-coder

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Developer Attribution

Created by **HARYX**  
- **GitHub**: [github.com/MHR-GEEK](https://github.com/MHR-GEEK)  
- **Instagram**: [@md_haris_raza_](https://www.instagram.com/md_haris_raza_/)  

---

<div align="center">
Built by <strong>HARYX</strong>
</div>
