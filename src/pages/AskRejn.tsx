import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, History, ArrowLeft, Loader2, Shuffle } from "lucide-react";
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
                className="flex-1 flex flex-col items-center justify-start pt-8 px-6"
              >
                {/* Mascot on grass */}
                <div className="relative w-full max-w-sm flex flex-col items-center">
                  <RejnMascot pose="sit" className="w-40 h-40 sm:w-48 sm:h-48 drop-shadow-xl" />
                  {/* Grass strip */}
                  <div className="-mt-4 w-56 h-3 rounded-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent blur-[2px]" />
                  <div className="-mt-2 w-44 h-1.5 rounded-full bg-gradient-to-r from-transparent via-green-700/40 to-transparent" />
                </div>

                <motion.h2
                  key={greeting}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-2xl sm:text-3xl font-bold text-center tracking-tight"
                >
                  {greeting}
                </motion.h2>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
                  Ask me anything — weather, plans, or just say hi.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3 py-2.5 rounded-xl text-sm text-left bg-card/60 hover:bg-card/90 border border-border/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3"
                ref={scrollRef}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="shrink-0">
                        <RejnMascot pose="wave" className="w-8 h-8" />
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/70 text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2 justify-start">
                    <RejnMascot pose="wave" className="w-8 h-8" />
                    <div className="bg-muted/70 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer */}
          <div className="px-3 sm:px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
            <Card className="glass-card-strong rounded-2xl">
              <CardContent className="p-2 flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={isEmpty ? `Message Rejn…` : "Reply…"}
                  rows={1}
                  className="min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 bg-transparent text-[15px]"
                  disabled={sending}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="h-10 w-10 rounded-xl shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <BottomTabBar />
      </div>
    </>
  );
}
