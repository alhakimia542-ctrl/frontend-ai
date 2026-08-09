"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Source {
  title: string;
  url: string;
}

interface ApiResponse {
  answer: string;
  sources: Source[];
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
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState(""); // the query currently shown in results
  const [status, setStatus] = useState<Status>("idle");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitted = status !== "idle";

  // Focus input on landing
  useEffect(() => {
    if (!submitted) inputRef.current?.focus();
  }, [submitted]);

  // ── API call ──────────────────────────────────────────────────────────────
  const fetchAnswer = async (q: string) => {
    setActiveQuery(q);
    setStatus("loading");
    setAnswer("");
    setSources([]);
    setErrorMsg("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail ?? `Server error: ${res.status} ${res.statusText}`
        );
      }

      const data: ApiResponse = await res.json();
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
      setStatus("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
      setStatus("error");
    }
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const q = typeof e === "string" ? e : query;
    if (!q.trim()) return;
    setQuery(q);
    fetchAnswer(q.trim());
  };

  // ── Reset to landing ──────────────────────────────────────────────────────
  const handleNewSearch = () => {
    setStatus("idle");
    setQuery("");
    setActiveQuery("");
    setAnswer("");
    setSources([]);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-[var(--font-geist-sans)]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d0d]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Al-hakimi <span className="text-violet-400">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
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
        </nav>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
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
          /* ── Results ──────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 gap-6">
            {/* Active query label */}
            <div className="flex items-center gap-2">
              <svg className="text-violet-400 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <h2 className="text-base font-medium text-zinc-200 truncate">{activeQuery}</h2>
            </div>

            {/* Inline search bar */}
            <SearchBar
              query={query}
              setQuery={setQuery}
              onSubmit={handleSearch}
              inputRef={inputRef}
              inputFocused={inputFocused}
              setInputFocused={setInputFocused}
              compact
              disabled={status === "loading"}
            />

            <div className="flex flex-col lg:flex-row gap-5">
              {/* ── Answer Panel ──────────────────────────────────────── */}
              <section className="flex-1 space-y-4 min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                  <div className={`w-1.5 h-1.5 rounded-full ${status === "loading" ? "bg-violet-500 animate-pulse" : status === "error" ? "bg-red-500" : "bg-emerald-500"}`} />
                  {status === "loading" ? "Thinking…" : status === "error" ? "Error" : "Answer"}
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  {status === "loading" && <AnswerSkeleton />}

                  {status === "error" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3 text-red-400">
                        <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                        <p className="text-sm leading-relaxed">{errorMsg}</p>
                      </div>
                      <button
                        onClick={() => fetchAnswer(activeQuery)}
                        className="self-start flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/[0.07] hover:border-white/[0.14] px-3 py-1.5 rounded-lg transition-all duration-200"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                        Try again
                      </button>
                    </div>
                  )}

                  {status === "success" && (
                    <AnswerContent answer={answer} />
                  )}
                </div>

                {/* Follow-up chips — only shown on success */}
                {status === "success" && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium">Related Questions</p>
                    <div className="flex flex-wrap gap-2">
                      {["Tell me more", "Give examples", "Simplify this", "Compare alternatives"].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => {
                            const q = `${chip}: ${activeQuery}`;
                            setQuery(q);
                            handleSearch(q);
                          }}
                          className="text-sm px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 transition-all duration-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Sources Panel ─────────────────────────────────────── */}
              <aside className="lg:w-72 space-y-4 shrink-0">
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Sources
                  {status === "success" && sources.length > 0 && (
                    <span className="ml-auto text-zinc-700">{sources.length}</span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {status === "loading" && <SourcesSkeleton />}

                  {status === "error" && (
                    <p className="text-xs text-zinc-600 italic">No sources available.</p>
                  )}

                  {status === "success" && sources.length === 0 && (
                    <p className="text-xs text-zinc-600 italic">No sources returned.</p>
                  )}

                  {status === "success" &&
                    sources.map((src, i) => {
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
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-4 px-6 flex items-center justify-between text-xs text-zinc-600">
        <span>© 2026 Al-hakimi AI</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">Docs</a>
        </div>
      </footer>
    </div>
  );
}

// ─── Answer Content ───────────────────────────────────────────────────────────
function AnswerContent({ answer }: { answer: string }) {
  // Render answer preserving newlines as paragraphs
  const paragraphs = answer.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.length > 0
        ? paragraphs.map((para, i) => (
            <p key={i} className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {para}
            </p>
          ))
        : <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{answer}</p>
      }
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
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className={`w-full ${compact ? "max-w-4xl" : "max-w-2xl"} mx-auto`}>
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
    </form>
  );
}
