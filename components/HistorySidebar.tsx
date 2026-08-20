"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "firebase/auth";

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  messages: any[];
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  user,
  currentChatId,
  onSelectChat,
}: HistorySidebarProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedChats: ChatSession[] = [];
        snapshot.forEach((doc) => {
          fetchedChats.push({ id: doc.id, ...doc.data() } as ChatSession);
        });
        setChats(fetchedChats);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chats: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sidebar container styles for slide-over effect
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 pt-[65px] bg-[#121212] border-r border-white/[0.06] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Chat History
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {!user ? (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">
              Sign in to save and view your chat history.
            </div>
          ) : loading ? (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">
              Loading history...
            </div>
          ) : chats.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">
              No previous chats found.
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat);
                  // Optionally don't close automatically on desktop, but closing is fine
                  onClose();
                }}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-all duration-200 group flex items-start gap-3 ${
                  currentChatId === chat.id
                    ? "bg-violet-500/10 text-violet-300"
                    : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <svg
                  className={`mt-0.5 shrink-0 w-4 h-4 ${
                    currentChatId === chat.id ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-400"
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="truncate flex-1 font-medium">{chat.title}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
