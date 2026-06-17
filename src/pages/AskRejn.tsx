import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, PanelLeft, ArrowLeft, Loader2, Shuffle, Trash2, MessageSquare, Search } from "lucide-react";

import { pickSuggestions } from "@/lib/ask-rejn-suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { SEOHead } from "@/components/seo/seo-head";
import { toast } from "sonner";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const GREETINGS = [
  "Hey, {name} 👋",
  "What's up, {name}?",
  "Sup {name}? Ask me anything ☁️",
  "Hej {name}! How can I help?",
  "Yo {name} — what's on your mind?",
  "Hi {name} 🌤️ — let's talk weather (or anything)",
  "Heyyy {name}, ready when you are",
];

// Suggestions are now sourced from a 200+ pool and shuffled on mount /
// new chat / shuffle button — see src/lib/ask-rejn-suggestions.ts.

export default function AskRejnPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions(4));
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    const raw =
      (profile as any)?.username ||
      (profile as any)?.display_name ||
      user?.email?.split("@")[0] ||
      "friend";
    return String(raw).split(/[\s@]/)[0];
  }, [profile, user]);

  const greeting = useMemo(() => {
    const tpl = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    return tpl.replace("{name}", displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, conversationId]);

  // List previous conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["rejn-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const deleteConversation = async (id: string) => {
    if (!user) return;
    const prev = conversationId;
    if (prev === id) {
      setConversationId(null);
      setMessages([]);
    }
    const { error: mErr } = await supabase.from("chat_messages").delete().eq("conversation_id", id);
    const { error: cErr } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
    if (mErr || cErr) {
      toast.error("Couldn't delete chat");
      return;
    }
    qc.invalidateQueries({ queryKey: ["rejn-conversations", user.id] });
  };

  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const groups: Record<string, any[]> = { Today: [], Yesterday: [], "Previous 7 days": [], "Previous 30 days": [], Older: [] };
    const filtered = (conversations as any[]).filter((c) =>
      !search.trim() ? true : (c.title || "").toLowerCase().includes(search.toLowerCase())
    );
    for (const c of filtered) {
      const ts = new Date(c.updated_at || c.created_at).getTime();
      const diff = now - ts;
      if (diff < day) groups.Today.push(c);
      else if (diff < 2 * day) groups.Yesterday.push(c);
      else if (diff < 7 * day) groups["Previous 7 days"].push(c);
      else if (diff < 30 * day) groups["Previous 30 days"].push(c);
      else groups.Older.push(c);
    }
    return groups;
  }, [conversations, search]);


  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?next=/ai");
  }, [authLoading, user, navigate]);

  const loadConversation = async (id: string) => {
    setConversationId(id);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load chat");
      return;
    }
    setMessages(
      (data || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    );
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setSuggestions(pickSuggestions(4));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !user) return;
    setSending(true);
    setInput("");

    let convId = conversationId;
    try {
      if (!convId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: text.slice(0, 60),
          })
          .select("id")
          .single();
        if (error) throw error;
        convId = data.id;
        setConversationId(convId);
      }

      // Optimistic
      const next = [...messages, { role: "user" as const, content: text }];
      setMessages(next);

      // Persist user message
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: "user",
        content: text,
      });

      // Call AI
      const { data, error } = await supabase.functions.invoke("ask-rejn", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const reply =
        data?.response ||
        "Hmm, no response. Try again?";

      const final = [
        ...next,
        { role: "assistant" as const, content: reply },
      ];
      setMessages(final);

      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: reply,
      });

      // Bump conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      qc.invalidateQueries({ queryKey: ["rejn-conversations", user.id] });
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't reach Rejn", { description: e?.message });
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <SEOHead title="Ask Rejn — AI Weather Chat" description="Chat with Rejn, your friendly weather mascot." />
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 px-4 py-3 flex items-center gap-2 glass-card-strong border-b border-border/40">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}> 
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">Ask Rejn</h1>
            <p className="text-[11px] text-muted-foreground">Your weather buddy</p>
          </div>
          <Button variant="ghost" size="icon" onClick={startNewChat} aria-label="New chat">
            <Plus className="w-5 h-5" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="History">
                <History className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px]">
              <SheetHeader>
                <SheetTitle>Your chats</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChat}>
                  <Plus className="w-4 h-4" /> New chat
                </Button>
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No chats yet</p>
                )}
                {conversations.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => loadConversation(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors truncate ${
                      conversationId === c.id ? "bg-muted/60 font-medium" : ""
                    }`}
                  >
                    {c.title || "Untitled chat"}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex-1 flex flex-col items-center justify-center px-6 pb-24"
              >
                {/* Mascot on grass */}
                <div className="relative flex flex-col items-center">
                  <RejnMascot pose="sit" className="w-32 h-32 sm:w-40 sm:h-40 drop-shadow-xl" />
                  <div className="-mt-3 w-48 h-2.5 rounded-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent blur-[2px]" />
                </div>

                <motion.h2
                  key={greeting}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-[28px] sm:text-4xl font-serif font-normal text-center tracking-tight"
                >
                  {greeting}
                </motion.h2>

                {/* Inline Claude-style composer */}
                <div className="mt-8 w-full max-w-2xl">
                  <div className="relative rounded-[28px] border border-border/40 bg-card/60 backdrop-blur-xl shadow-lg transition-colors focus-within:border-border/70">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="How can I help you today?"
                      rows={1}
                      className="min-h-[56px] max-h-40 resize-none border-0 focus-visible:ring-0 bg-transparent text-[16px] px-5 pt-4 pb-12 rounded-[28px]"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={send}
                      disabled={sending || !input.trim()}
                      className="absolute right-2.5 bottom-2.5 h-9 w-9 rounded-full shrink-0"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Suggestion pills */}
                  <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
                    <AnimatePresence mode="popLayout">
                      {suggestions.map((s) => (
                        <motion.button
                          key={s}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => setInput(s)}
                          className="px-3.5 py-1.5 rounded-full text-[13px] bg-card/50 hover:bg-card/80 border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {s}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    <button
                      onClick={() => setSuggestions(pickSuggestions(4))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
                      aria-label="Shuffle suggestions"
                    >
                      <Shuffle className="w-3 h-3" /> Shuffle
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
                  ref={scrollRef}
                >
                  <div className="max-w-2xl mx-auto space-y-6">
                    {messages.map((m, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        {m.role === "assistant" ? (
                          <div className="flex gap-3">
                            <RejnMascot pose="wave" className="w-7 h-7 shrink-0 mt-0.5" />
                            <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 flex-1">
                              {m.content}
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap bg-muted/60 text-foreground">
                              {m.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {sending && (
                      <div className="flex gap-3">
                        <RejnMascot pose="wave" className="w-7 h-7 shrink-0 mt-0.5" />
                        <div className="flex gap-1.5 items-center h-7">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Bottom composer for active chat */}
                <div className="px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
                  <div className="max-w-2xl mx-auto relative rounded-[28px] border border-border/40 bg-card/70 backdrop-blur-xl shadow-lg focus-within:border-border/70">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Reply to Rejn…"
                      rows={1}
                      className="min-h-[52px] max-h-40 resize-none border-0 focus-visible:ring-0 bg-transparent text-[15px] px-5 pt-3.5 pb-11 rounded-[28px]"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={send}
                      disabled={sending || !input.trim()}
                      className="absolute right-2.5 bottom-2.5 h-9 w-9 rounded-full shrink-0"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>

        <BottomTabBar />
      </div>
    </>
  );
}
