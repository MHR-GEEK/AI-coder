"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Bot,
  Camera,
  Check,
  Copy,
  Download,
  Edit3,
  FileArchive,
  FileCode2,
  Github,
  ImagePlus,
  Instagram,
  Loader2,
  Mic,
  Moon,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Square,
  Sun,
  Trash2,
  X
} from "lucide-react";

type Role = "user" | "assistant";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: "image" | "file";
  dataUrl?: string;
  content?: string;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  error?: boolean;
};

type MessagePart =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language: string }
  | { type: "table"; rows: string[][] };

const QUICK_ACTIONS = ["Debug Code", "Explain Error", "Refactor", "Generate Project"];
const TEXT_FILE_TYPES = new Set(["txt", "md", "json", "js", "ts", "jsx", "tsx", "py", "java", "cpp"]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function uid() {
  return crypto.randomUUID();
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function splitMessage(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const codeBlockPattern = /```([\w.+-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...splitTextAndTables(content.slice(lastIndex, match.index)));
    }
    parts.push({ type: "code", language: match[1] || "code", content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) parts.push(...splitTextAndTables(content.slice(lastIndex)));
  return parts.length ? parts : [{ type: "text", content }];
}

function splitTextAndTables(text: string): MessagePart[] {
  const lines = text.split("\n");
  const parts: MessagePart[] = [];
  let buffer: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const isTableStart = lines[index]?.includes("|") && lines[index + 1]?.match(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/);
    if (!isTableStart) {
      buffer.push(lines[index]);
      index += 1;
      continue;
    }

    if (buffer.join("\n").trim()) parts.push({ type: "text", content: buffer.join("\n") });
    buffer = [];

    const tableLines = [lines[index]];
    index += 2;
    while (index < lines.length && lines[index].includes("|")) {
      tableLines.push(lines[index]);
      index += 1;
    }

    parts.push({
      type: "table",
      rows: tableLines.map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    });
  }

  if (buffer.join("\n").trim()) parts.push({ type: "text", content: buffer.join("\n") });
  return parts;
}

function renderInlineMarkdown(text: string) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    return <span key={index}>{token}</span>;
  });
}

function MarkdownText({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter((block) => block.trim());

  return (
    <>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("### ")) return <h3 key={index}>{renderInlineMarkdown(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith("## ")) return <h2 key={index}>{renderInlineMarkdown(trimmed.slice(3))}</h2>;
        if (trimmed.startsWith("# ")) return <h1 key={index}>{renderInlineMarkdown(trimmed.slice(2))}</h1>;

        const lines = trimmed.split("\n");
        const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>)}
            </ul>
          );
        }

        if (isOrdered) {
          return (
            <ol key={index}>
              {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>)}
            </ol>
          );
        }

        return <p key={index}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </>
  );
}

const CodeBlock = memo(function CodeBlock({
  content,
  language,
  onCopy,
  copied
}: {
  content: string;
  language: string;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  const [collapsed, setCollapsed] = useState(content.split("\n").length > 22);

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <small>{language}</small>
        <div>
          {content.split("\n").length > 22 && (
            <button type="button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Expand" : "Collapse"}</button>
          )}
          <button type="button" onClick={() => onCopy(content)} aria-label="Copy code">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className={collapsed ? "collapsed-code" : ""}>
        <code>{content}</code>
      </pre>
    </div>
  );
});

function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove?: (id: string) => void }) {
  return (
    <div className="attachment-chip">
      {attachment.kind === "image" && attachment.dataUrl ? (
        <button className="thumb-button" type="button" onClick={() => window.open(attachment.dataUrl, "_blank")} aria-label={`Open ${attachment.name}`}>
          <img src={attachment.dataUrl} alt={attachment.name} />
        </button>
      ) : (
        <span className="file-icon">{fileExtension(attachment.name) === "zip" ? <FileArchive size={18} /> : <FileCode2 size={18} />}</span>
      )}
      <span>
        <strong>{attachment.name}</strong>
        <small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small>
      </span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.name}`}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

const ChatMessage = memo(function ChatMessage({
  message,
  copiedCode,
  copiedMessage,
  onCopyCode,
  onCopyMessage,
  onRegenerate,
  onDelete,
  onEdit
}: {
  message: Message;
  copiedCode: string | null;
  copiedMessage: string | null;
  onCopyCode: (code: string) => void;
  onCopyMessage: (message: Message) => void;
  onRegenerate: (message: Message) => void;
  onDelete: (id: string) => void;
  onEdit: (message: Message) => void;
}) {
  const parts = useMemo(() => splitMessage(message.content), [message.content]);

  return (
    <article className={`message ${message.role} ${message.error ? "error" : ""}`}>
      <div className="avatar" aria-hidden="true">{message.role === "assistant" ? <Bot size={18} /> : "You"}</div>
      <div className="message-body">
        <div className="message-meta">
          <strong>{message.role === "assistant" ? "HARYX AI" : "You"}</strong>
          <time>{formatTime(message.timestamp)}</time>
        </div>
        {message.attachments?.length ? (
          <div className="sent-attachments">
            {message.attachments.map((attachment) => <AttachmentPreview key={attachment.id} attachment={attachment} />)}
          </div>
        ) : null}
        <div className="message-content">
          {parts.map((part, index) => {
            if (part.type === "code") {
              return (
                <CodeBlock
                  key={`${message.id}-code-${index}`}
                  content={part.content}
                  language={part.language}
                  copied={copiedCode === part.content}
                  onCopy={onCopyCode}
                />
              );
            }

            if (part.type === "table") {
              return (
                <div className="table-wrap" key={`${message.id}-table-${index}`}>
                  <table>
                    <tbody>
                      {part.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return <MarkdownText key={`${message.id}-text-${index}`} content={part.content} />;
          })}
        </div>
        <div className="message-actions">
          <button type="button" onClick={() => onCopyMessage(message)}>
            {copiedMessage === message.id ? <Check size={14} /> : <Copy size={14} />}
            {copiedMessage === message.id ? "Copied" : "Copy"}
          </button>
          {message.role === "assistant" && <button type="button" onClick={() => onRegenerate(message)}><RefreshCcw size={14} /> Regenerate</button>}
          {message.role === "user" && <button type="button" onClick={() => onEdit(message)}><Edit3 size={14} /> Edit</button>}
          <button type="button" onClick={() => onDelete(message.id)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </article>
  );
});

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [title, setTitle] = useState("AI Coder Chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"idle" | "connected" | "needs-setup">("idle");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("ai-coder-chat");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setMessages(parsed.messages || []);
      setTitle(parsed.title || "AI Coder Chat");
    } catch {
      localStorage.removeItem("ai-coder-chat");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ai-coder-chat", JSON.stringify({ title, messages }));
  }, [messages, title]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const visibleMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const needle = search.toLowerCase();
    return messages.filter((message) => message.content.toLowerCase().includes(needle));
  }, [messages, search]);

  const statusText = useMemo(() => {
    if (loading) return "Generating";
    if (backendStatus === "connected") return "Ollama online";
    if (backendStatus === "needs-setup") return "Needs attention";
    return "Ready";
  }, [backendStatus, loading]);

  const readFiles = useCallback(async (files: FileList | File[]) => {
    const nextAttachments = await Promise.all(
      Array.from(files).map(async (file) => {
        const extension = fileExtension(file.name);
        const isImage = IMAGE_TYPES.has(file.type);
        const attachment: Attachment = {
          id: uid(),
          name: file.name,
          type: file.type || extension,
          size: file.size,
          kind: isImage ? "image" : "file"
        };

        if (isImage) {
          attachment.dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Image upload failed"));
            reader.readAsDataURL(file);
          });
        } else if (TEXT_FILE_TYPES.has(extension)) {
          attachment.content = await file.text();
        }

        return attachment;
      })
    );

    setAttachments((current) => [...current, ...nextAttachments]);
  }, []);

  const submitMessage = useCallback(async (event?: FormEvent, quickAction?: string, retryMessages?: Message[]) => {
    event?.preventDefault();
    const retryUserMessage = retryMessages ? [...retryMessages].reverse().find((message) => message.role === "user") : undefined;
    const content = (quickAction || input || retryUserMessage?.content || "").trim();
    const hasAttachments = retryMessages ? Boolean(retryUserMessage?.attachments?.length) : attachments.length > 0;
    if ((!content && !hasAttachments) || loading) return;

    const userMessage: Message = {
      id: uid(),
      role: "user",
      content: content || "Analyze the attached file or image.",
      timestamp: Date.now(),
      attachments: retryMessages ? retryUserMessage?.attachments || [] : attachments
    };
    const nextMessages = retryMessages || [...messages, userMessage];
    const requestAttachments = retryMessages ? retryUserMessage?.attachments || [] : attachments;

    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
          images: requestAttachments.filter((item) => item.kind === "image" && item.dataUrl).map((item) => item.dataUrl),
          files: requestAttachments.filter((item) => item.kind === "file").map((item) => ({
            name: item.name,
            type: item.type,
            size: item.size,
            content: item.content
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "The AI service returned an error.");

      setMessages([...nextMessages, { id: uid(), role: "assistant", content: data.content, timestamp: Date.now() }]);
      setBackendStatus("connected");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setBackendStatus("needs-setup");
      setMessages([
        ...nextMessages,
        {
          id: uid(),
          role: "assistant",
          error: true,
          timestamp: Date.now(),
          content:
            error instanceof Error
              ? `# Connection Issue\n\n${error.message}\n\n## Try Again\n\n- Check your Vercel environment variables.\n- Verify the Ollama API key is valid.\n- Retry the request.`
              : "# Connection Issue\n\nThe AI backend could not be reached."
        }
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [attachments, input, loading, messages]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) readFiles(event.dataTransfer.files);
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (files.length) await readFiles(files);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1300);
  }

  function copyMessage(message: Message) {
    navigator.clipboard.writeText(message.content);
    setCopiedMessage(message.id);
    window.setTimeout(() => setCopiedMessage(null), 1300);
  }

  function deleteMessage(id: string) {
    setMessages((current) => current.filter((message) => message.id !== id));
  }

  function editMessage(message: Message) {
    setInput(message.content);
    setMessages((current) => current.filter((item) => item.id !== message.id));
    textareaRef.current?.focus();
  }

  function regenerate(message: Message) {
    const index = messages.findIndex((item) => item.id === message.id);
    submitMessage(undefined, undefined, messages.slice(0, index).filter((item) => item.id !== message.id));
  }

  function exportMarkdown() {
    const markdown = messages.map((message) => `## ${message.role === "user" ? "User" : "HARYX AI"} - ${formatTime(message.timestamp)}\n\n${message.content}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "ai-coder-chat"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main
      className={`chat-app ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <header className="app-header">
        <a className="brand" href="#" aria-label="AI Coder home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Rename chat" />
            <small>{statusText} · HARYX</small>
          </span>
        </a>
        <div className="header-tools">
          <label className="search-box">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chat" />
          </label>
          <button type="button" onClick={exportMarkdown} aria-label="Export Markdown"><Download size={18} /></button>
          <button type="button" onClick={() => window.print()} aria-label="Export PDF"><FileCode2 size={18} /></button>
          <button type="button" onClick={() => setMessages([])} aria-label="Clear chat"><Trash2 size={18} /></button>
          <a href="https://github.com/MHR-GEEK" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18} /></a>
          <a href="https://www.instagram.com/md_haris_raza_/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <section className="chat-shell">
        <div className="messages" ref={chatRef}>
          {!messages.length && (
            <div className="welcome-panel">
              <div className="welcome-orb"><Bot size={28} /></div>
              <h1>What are we building today?</h1>
              <p>Ask for code, upload screenshots, paste errors, attach files, or generate a complete project with HARYX AI.</p>
            </div>
          )}

          {visibleMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              copiedCode={copiedCode}
              copiedMessage={copiedMessage}
              onCopyCode={copyCode}
              onCopyMessage={copyMessage}
              onRegenerate={regenerate}
              onDelete={deleteMessage}
              onEdit={editMessage}
            />
          ))}

          {loading && (
            <article className="message assistant">
              <div className="avatar"><Bot size={18} /></div>
              <div className="message-body">
                <div className="message-meta"><strong>HARYX AI</strong><time>typing</time></div>
                <div className="typing-indicator"><span /><span /><span /> Thinking through the solution...</div>
              </div>
            </article>
          )}
        </div>

        <form className="composer" onSubmit={submitMessage}>
          {!messages.length && (
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action) => (
                <button type="button" key={action} onClick={() => submitMessage(undefined, action)}>{action}</button>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="attachment-strip">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
                />
              ))}
            </div>
          )}

          <div className="composer-box">
            <label className="tool-button" aria-label="Upload image">
              <ImagePlus size={19} />
              <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple capture="environment" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && readFiles(event.target.files)} />
            </label>
            <label className="tool-button" aria-label="Attach file">
              <Paperclip size={19} />
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.json,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.zip" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && readFiles(event.target.files)} />
            </label>
            <button className="tool-button" type="button" aria-label="Mic coming soon"><Mic size={19} /></button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Message HARYX AI. Drop images, paste screenshots, or attach files..."
              rows={1}
            />
            {loading ? (
              <button className="send-button" type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop generation"><Square size={18} /></button>
            ) : (
              <button className="send-button" type="submit" disabled={!input.trim() && attachments.length === 0} aria-label="Send message">
                <Send size={19} />
              </button>
            )}
          </div>
          <div className="composer-hint"><Camera size={14} /> Enter sends · Shift+Enter adds a new line · Paste or drop screenshots anywhere</div>
        </form>
      </section>
    </main>
  );
}
