"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Code2,
  Github,
  ImagePlus,
  Instagram,
  Loader2,
  Moon,
  Send,
  Sparkles,
  Sun,
  X
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starters = [
  "Build me a full-stack auth system in Next.js",
  "Fix this error and explain the root cause",
  "Create an AI image analyzer API",
  "Refactor this code for production"
];

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [backendStatus, setBackendStatus] = useState<"idle" | "connected" | "needs-setup">("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I am HARYX AI Coder. Send code, describe a build, or upload an error screenshot and I will help you turn it into working software."
    }
  ]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const statusText = useMemo(() => {
    if (loading) return "Generating solution";
    if (backendStatus === "connected") return "Ollama AI online";
    if (backendStatus === "needs-setup") return "Ollama setup needed";
    return "Connect Ollama backend";
  }, [backendStatus, loading]);

  const readinessText = useMemo(() => {
    if (loading) return "Thinking";
    if (backendStatus === "needs-setup") return "Check setup";
    return "Ready to code";
  }, [backendStatus, loading]);

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100)
    });
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submitMessage(event?: FormEvent, starter?: string) {
    event?.preventDefault();
    const content = (starter || input).trim();
    if (!content || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, image })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "The AI service returned an error.");
      }

      setMessages([...nextMessages, { role: "assistant", content: data.content }]);
      setBackendStatus("connected");
      setImage(null);
      setImageName("");
    } catch (error) {
      setBackendStatus("needs-setup");
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `I could not reach the AI backend yet: ${error.message}`
              : "I could not reach the AI backend yet."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell" onMouseMove={handleMouseMove} style={{ "--mx": `${pointer.x}%`, "--my": `${pointer.y}%` } as React.CSSProperties}>
      <div className="noise" />

      <nav className="topbar reveal">
        <a className="brand" href="#chat" aria-label="AI Coder home">
          <span className="brand-mark">
            <Code2 size={22} />
          </span>
          <span>
            <strong>AI Coder</strong>
            <small>by HARYX</small>
          </span>
        </a>

        <div className="nav-actions">
          <a href="https://github.com/MHR-GEEK" target="_blank" rel="noreferrer" aria-label="GitHub">
            <Github size={19} />
          </a>
          <a href="https://www.instagram.com/md_haris_raza_/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <Instagram size={19} />
          </a>
          <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </nav>

      <section className="hero reveal">
        <img className="hero-visual" src="/assets/ai-coder-hero.png" alt="" aria-hidden="true" />
        <div className="hero-scan" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} />
            Smart programming AI with vision
          </div>
          <h1>AI Coder</h1>
          <p>
            Ask for apps, APIs, debugging, AI workflows, frontend polish, deployment help, or upload screenshots of code errors. The Ollama model runs through a protected server route so users get a clean coding assistant experience.
          </p>
          <div className="hero-links">
            <a href="#chat">Start building</a>
            <a href="https://github.com/MHR-GEEK" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </section>

      <section className="feature-strip reveal">
        <div>
          <Bot size={20} />
          <span>No-code limits in UI</span>
        </div>
        <div>
          <ImagePlus size={20} />
          <span>Image error solving</span>
        </div>
        <div>
          <Sparkles size={20} />
          <span>Futuristic motion system</span>
        </div>
      </section>

      <section id="chat" className="workspace reveal">
        <aside className="command-deck">
          <div className="model-card">
            <span className="pulse" />
            <div>
              <small>{statusText}</small>
              <strong>{readinessText}</strong>
            </div>
          </div>

          <div className="starter-list">
            {starters.map((starter) => (
              <button key={starter} onClick={() => submitMessage(undefined, starter)} disabled={loading}>
                {starter}
              </button>
            ))}
          </div>

          <div className="developer-card">
            <small>Developer</small>
            <strong>HARYX</strong>
            <a href="https://www.instagram.com/md_haris_raza_/" target="_blank" rel="noreferrer">
              @md_haris_raza_
            </a>
          </div>
        </aside>

        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <small>AI programming cockpit</small>
              <strong>Build anything you command</strong>
            </div>
            <span>Ollama</span>
          </div>

          <div className="messages" ref={chatRef}>
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "assistant" ? "AI" : "You"}</span>
                <p>{message.content}</p>
              </article>
            ))}
            {loading && (
              <article className="message assistant thinking">
                <span>AI</span>
                <p>
                  <Loader2 size={16} />
                  Reading context and building the answer...
                </p>
              </article>
            )}
          </div>

          {image && (
            <div className="upload-preview">
              <img src={image} alt="Uploaded code problem" />
              <span>{imageName}</span>
              <button onClick={() => setImage(null)} aria-label="Remove image">
                <X size={16} />
              </button>
            </div>
          )}

          <form className="composer" onSubmit={submitMessage}>
            <label className="upload-button" aria-label="Upload coding screenshot">
              <ImagePlus size={20} />
              <input type="file" accept="image/*" onChange={handleImage} />
            </label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage();
                }
              }}
              placeholder="Ask HARYX AI to build, debug, explain, refactor, or solve a coding screenshot..."
              rows={1}
            />
            <button className="send-button" type="submit" disabled={loading || !input.trim()}>
              {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
