"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AuthButton from "../components/AuthButton";
import HistorySidebar, { ChatSession } from "../components/HistorySidebar";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Source {
  title: string;
  url: string;
}

interface ApiResponse {
  answer: string;
  sources: Source[];
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  sources?: Source[];
}

type Status = "idle" | "loading" | "success" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = "https://alhakim-ai.onrender.com/api/ask";

const SUGGESTED_QUERIES = [
  "What is quantum computing?",
  "Explain the latest AI breakthroughs",
  "How does the human brain work?",
  "What are black holes?",
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  
  // History & Session state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Input & Status state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [siteFilter, setSiteFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("");
  const [focusMode, setFocusMode] = useState("web");
  
  // Models
  const [models, setModels] = useState<{ id: string; name: string }[]>([
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Default)" },
    { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
    { id: "meta-llama/llama-3.2-3b-instruct", name: "Llama 3.2 3B" },
  ]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-exp:free");

  // Auto-scroll ref
  const bottomRef = useRef<HTMLDivElement>(null);

  const submitted = messages.length > 0 || status !== "idle";

  // Watch Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch models on load
  useEffect(() => {
    fetch(API_URL.replace("/ask", "/models"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
        } else if (data && Array.isArray(data.data) && data.data.length > 0) {
          setModels(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch models:", err));
  }, []);

  // Focus input on landing
  useEffect(() => {
    if (!submitted) inputRef.current?.focus();
  }, [submitted]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  // ── API call ──────────────────────────────────────────────────────────────
  const fetchAnswer = async (q: string) => {
    setStatus("loading");
    setErrorMsg("");

    const userMessage: ChatMessage = { role: "user", content: q };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Save/Update in Firestore (optimistic, before we even get the answer)
    let chatId = currentChatId;
    if (user) {
      if (!chatId) {
        // Create new chat document
        const newDocRef = doc(collection(db, "chats"));
        chatId = newDocRef.id;
        setCurrentChatId(chatId);
        await setDoc(newDocRef, {
          userId: user.uid,
          title: q,
          createdAt: serverTimestamp(),
          messages: updatedMessages,
        }).catch(err => console.error("Error creating chat:", err));
      } else {
        // Update existing chat
        const docRef = doc(db, "chats", chatId);
        await updateDoc(docRef, {
          messages: updatedMessages,
        }).catch(err => console.error("Error updating chat:", err));
      }
    }

    try {
      // Send the FULL messages array instead of just a single query
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          site_filter: siteFilter,
          time_filter: timeFilter,
          model: selectedModel,
          focus_mode: focusMode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail ?? `Server error: ${res.status} ${res.statusText}`
        );
      }

      const data: ApiResponse = await res.json();
      
      const aiMessage: ChatMessage = { 
        role: "ai", 
        content: data.answer ?? "", 
        sources: data.sources ?? [] 
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      setStatus("success");

      // Save AI response to Firestore
      if (user && chatId) {
        const docRef = doc(db, "chats", chatId);
        await updateDoc(docRef, {
          messages: finalMessages,
        }).catch(err => console.error("Error updating chat with AI response:", err));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
      setStatus("error");
      
      // If there's an error, we can remove the user's message from the UI or just leave it
      // Leaving it is fine, just show the error.
    }
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const q = typeof e === "string" ? e : query;
    if (!q.trim()) return;
    setQuery(""); // Clear input
    fetchAnswer(q.trim());
  };

  // ── Reset to landing ──────────────────────────────────────────────────────
  const handleNewSearch = () => {
    setStatus("idle");
    setQuery("");
    setCurrentChatId(null);
    setMessages([]);
    setErrorMsg("");
  };

  // ── Load Past Chat ────────────────────────────────────────────────────────
  const handleSelectChat = (chat: ChatSession) => {
    setStatus("success"); // We have loaded successfully
    setCurrentChatId(chat.id);
    setMessages(chat.messages || []);
    setErrorMsg("");
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-[var(--font-geist-sans)]">
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d0d]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white hidden sm:block">
            Al-hakimi <span className="text-violet-400">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            History
          </button>
          <button
            onClick={handleNewSearch}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 shadow-md shadow-violet-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Search
          </button>
          <div className="w-[1px] h-6 bg-white/10 hidden sm:block mx-1"></div>
          <AuthButton />
        </nav>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative">
        {!submitted ? (
          /* ── Landing ──────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-10">
            <div className="text-center space-y-3">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent leading-tight">
                Ask anything.
              </h1>
              <p className="text-zinc-500 text-lg max-w-md mx-auto leading-relaxed">
                Al-hakimi AI gives you instant, cited answers powered by real-time web intelligence.
              </p>
            </div>

            <SearchBar
              query={query}
              setQuery={setQuery}
              onSubmit={handleSearch}
              inputRef={inputRef}
              inputFocused={inputFocused}
              setInputFocused={setInputFocused}
              disabled={false}
              siteFilter={siteFilter}
              setSiteFilter={setSiteFilter}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              models={models}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
            />

            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSearch(q)}
                  className="text-sm px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Chat Thread ──────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto pb-32">
            <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col gap-3">
                  {msg.role === "user" ? (
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-white/[0.1] flex items-center justify-center text-sm font-semibold">
                        {user ? (user.displayName?.[0]?.toUpperCase() || "U") : "U"}
                      </div>
                      <h2 className="text-xl font-semibold text-zinc-200">{msg.content}</h2>
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row gap-5 ml-11">
                      {/* ── Answer Panel ──────────────────────────────────────── */}
                      <section className="flex-1 space-y-4 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Answer
                        </div>

                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                          <AnswerContent answer={msg.content} />
                        </div>
                      </section>

                      {/* ── Sources Panel ─────────────────────────────────────── */}
                      {msg.sources && msg.sources.length > 0 && (
                        <aside className="lg:w-72 space-y-4 shrink-0">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Sources
                            <span className="ml-auto text-zinc-700">{msg.sources.length}</span>
                          </div>
                          <div className="space-y-2.5">
                            {msg.sources.map((src, i) => {
                              let hostname = src.url;
                              try { hostname = new URL(src.url).hostname.replace(/^www\./, ""); } catch {}
                              return (
                                <a
                                  key={i}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-200 cursor-pointer group"
                                >
                                  <span className="flex-shrink-0 w-5 h-5 rounded-md bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-bold group-hover:bg-violet-500/30 transition-colors">
                                    {i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm text-zinc-200 font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
                                      {src.title || hostname}
                                    </p>
                                    <p className="text-xs text-zinc-600 mt-0.5 truncate">{hostname}</p>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </aside>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State / Error State for current request */}
              {status === "loading" && (
                <div className="flex flex-col gap-3">
                   <div className="flex flex-col lg:flex-row gap-5 ml-11">
                    <section className="flex-1 space-y-4 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                        Thinking…
                      </div>
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                        <AnswerSkeleton />
                      </div>
                    </section>
                    <aside className="lg:w-72 space-y-4 shrink-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        Sources
                      </div>
                      <div className="space-y-2.5">
                        <SourcesSkeleton />
                      </div>
                    </aside>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col gap-3 ml-11">
                  <section className="flex-1 space-y-4 min-w-0">
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3 text-red-400">
                          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                          <p className="text-sm leading-relaxed">{errorMsg}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              <div ref={bottomRef} className="h-4" />
            </div>

            {/* Input Fixed at Bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent z-10 pt-16">
              <div className="max-w-4xl mx-auto w-full relative">
                {/* Follow-up chips for the latest AI message if success */}
                {status === "success" && messages.length > 0 && messages[messages.length - 1].role === "ai" && (
                  <div className="absolute bottom-full left-0 mb-4 ml-2 right-0 overflow-x-auto no-scrollbar">
                    <div className="flex flex-nowrap gap-2">
                      {["Tell me more", "Give examples", "Simplify this", "Compare alternatives"].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => {
                            const q = `${chip}`;
                            handleSearch(q);
                          }}
                          className="text-sm whitespace-nowrap px-3 py-1.5 rounded-lg border border-white/[0.07] bg-[#1a1a1a] shadow-lg text-zinc-400 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 transition-all duration-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  onSubmit={handleSearch}
                  inputRef={inputRef}
                  inputFocused={inputFocused}
                  setInputFocused={setInputFocused}
                  compact
                  disabled={status === "loading"}
                  siteFilter={siteFilter}
                  setSiteFilter={setSiteFilter}
                  timeFilter={timeFilter}
                  setTimeFilter={setTimeFilter}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  models={models}
                  focusMode={focusMode}
                  setFocusMode={setFocusMode}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Answer Content ───────────────────────────────────────────────────────────
function AnswerContent({ answer }: { answer: string }) {
  return (
    <div className="text-zinc-300 leading-relaxed space-y-3">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold text-zinc-100 mt-3 mb-1">{children}</h3>,
        // Paragraph
        p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
        // Bold / italic
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
        // Inline code
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className={`block bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-3 text-sm font-mono text-violet-300 overflow-x-auto my-3 ${className}`} {...props}>
              {children}
            </code>
          ) : (
            <code className="bg-white/[0.08] text-violet-300 text-sm font-mono px-1.5 py-0.5 rounded" {...props}>
              {children}
            </code>
          );
        },
        // Code block wrapper
        pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
        // Unordered list
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-zinc-300 my-2 pl-2">{children}</ul>,
        // Ordered list
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-zinc-300 my-2 pl-2">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-violet-500/50 pl-4 py-1 my-3 text-zinc-400 italic bg-white/[0.02] rounded-r-lg">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors duration-150"
          >
            {children}
          </a>
        ),
        // Horizontal rule
        hr: () => <hr className="border-white/[0.08] my-4" />,
        // Table
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-white/[0.05]">{children}</thead>,
        tr: ({ children }) => <tr className="border-b border-white/[0.06]">{children}</tr>,
        th: ({ children }) => <th className="text-left px-3 py-2 text-zinc-200 font-semibold">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-zinc-300">{children}</td>,
      }}
    >
      {answer}
    </ReactMarkdown>
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────
function AnswerSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3.5 rounded-full bg-white/[0.07] w-full" />
      <div className="h-3.5 rounded-full bg-white/[0.07] w-[92%]" />
      <div className="h-3.5 rounded-full bg-white/[0.07] w-[85%]" />
      <div className="h-3.5 rounded-full bg-white/[0.07] w-[78%]" />
      <div className="h-3.5 rounded-full bg-white/[0.07] w-[60%]" />
      <div className="pt-2 space-y-2">
        <div className="h-3 rounded-full bg-white/[0.04] w-full" />
        <div className="h-3 rounded-full bg-white/[0.04] w-5/6" />
        <div className="h-3 rounded-full bg-white/[0.04] w-4/6" />
      </div>
    </div>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
          <div className="w-5 h-5 rounded-md bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded-full bg-white/[0.06] w-4/5" />
            <div className="h-2.5 rounded-full bg-white/[0.04] w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Focus Mode Options ────────────────────────────────────────────────────────
const FOCUS_OPTIONS = [
  { value: "web",      label: "🌐 General Web" },
  { value: "medical",  label: "🩺 Medical & Health" },
  { value: "academic", label: "🎓 Academic" },
] as const;

// ─── Search Bar ───────────────────────────────────────────────────────────────
interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputFocused: boolean;
  setInputFocused: (v: boolean) => void;
  compact?: boolean;
  disabled?: boolean;
  siteFilter: string;
  setSiteFilter: (v: string) => void;
  timeFilter: string;
  setTimeFilter: (v: string) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  models: { id: string; name: string }[];
  focusMode: string;
  setFocusMode: (v: string) => void;
}

function SearchBar({
  query,
  setQuery,
  onSubmit,
  inputRef,
  inputFocused,
  setInputFocused,
  compact = false,
  disabled = false,
  siteFilter,
  setSiteFilter,
  timeFilter,
  setTimeFilter,
  selectedModel,
  setSelectedModel,
  models,
  focusMode,
  setFocusMode,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className={`w-full ${compact ? "max-w-4xl" : "max-w-2xl"} mx-auto flex flex-col gap-3`}>
      <div
        className={`relative flex items-center gap-3 rounded-2xl border transition-all duration-300 ${
          inputFocused
            ? "border-violet-500/60 bg-[#1a1a2e] shadow-xl shadow-violet-500/10"
            : "border-white/[0.09] bg-[#161616] hover:border-white/[0.14]"
        } ${compact ? "px-4 py-3" : "px-5 py-4"}`}
      >
        {/* Search / spinner icon */}
        {disabled ? (
          <svg
            className="shrink-0 text-violet-400 animate-spin"
            width={compact ? "16" : "18"}
            height={compact ? "16" : "18"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            className={`shrink-0 transition-colors duration-200 ${inputFocused ? "text-violet-400" : "text-zinc-600"}`}
            width={compact ? "16" : "18"}
            height={compact ? "16" : "18"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={disabled ? "Searching…" : "Ask Al-hakimi AI anything…"}
          disabled={disabled}
          className={`flex-1 bg-transparent outline-none placeholder-zinc-600 text-white disabled:opacity-60 ${compact ? "text-sm" : "text-base"}`}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear button */}
        {query && !disabled && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!query.trim() || disabled}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-violet-500/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "px-1" : "px-2"} transition-opacity duration-300`}>
        {/* ── Model Selector ── */}
        <div className="relative group">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="appearance-none bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 outline-none hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all duration-200 cursor-pointer max-w-[150px] sm:max-w-[180px] truncate"
          >
            {models.map(m => (
              <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-zinc-300">
                {m.name || m.id}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* ── Site Filter ── */}
        <div className="relative group">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="appearance-none bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 outline-none hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
          >
            <option value="all" className="bg-[#1a1a1a] text-zinc-300">All Sites</option>
            <option value="wikipedia.org" className="bg-[#1a1a1a] text-zinc-300">Wikipedia</option>
            <option value="youtube.com" className="bg-[#1a1a1a] text-zinc-300">YouTube</option>
            <option value="reddit.com" className="bg-[#1a1a1a] text-zinc-300">Reddit</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* ── Time Filter ── */}
        <div className="relative group">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="appearance-none bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-xs font-medium rounded-lg pl-3 pr-7 py-1.5 outline-none hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
          >
            <option value="" className="bg-[#1a1a1a] text-zinc-300">Any time</option>
            <option value="qdr:d" className="bg-[#1a1a1a] text-zinc-300">Past 24 Hours</option>
            <option value="qdr:w" className="bg-[#1a1a1a] text-zinc-300">Past Week</option>
            <option value="qdr:m" className="bg-[#1a1a1a] text-zinc-300">Past Month</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* ── Focus Mode ── */}
        <div
          className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden"
          role="group"
          aria-label="Focus mode"
        >
          {FOCUS_OPTIONS.map((opt, idx) => {
            const isActive = focusMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFocusMode(opt.value)}
                title={opt.label}
                aria-pressed={isActive}
                className={[
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                  idx > 0 ? "border-l border-white/[0.08]" : "",
                  isActive
                    ? "bg-violet-600/80 text-white shadow-inner"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <span>{opt.label.split(" ")[0]}</span>
                <span className="hidden sm:inline">{opt.label.split(" ").slice(1).join(" ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
