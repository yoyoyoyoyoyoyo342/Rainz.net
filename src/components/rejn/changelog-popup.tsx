import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  body_markdown: string;
  image_url: string | null;
  image_urls: string[] | null;
  published_at: string | null;
}

const LS_SEEN_PREFIX = "rejn.changelog_seen.";

/**
 * "What did we change?" popup. Shows the newest published entry once per
 * user per version. Guests use localStorage; signed-in users also persist
 * `profiles.changelog_seen_version`. Never opens over the cookie banner.
 */
export function ChangelogPopup() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  const images = useMemo(() => {
    if (!entry) return [] as string[];
    const arr = (entry.image_urls ?? []).filter(Boolean);
    if (arr.length > 0) return arr;
    return entry.image_url ? [entry.image_url] : [];
  }, [entry]);

  useEffect(() => {
    let cancelled = false;

    const attempt = async () => {
      if (typeof window === "undefined") return;
      // Never open on top of onboarding/auth flows — those own the screen.
      const path = window.location.pathname;
      if (path.startsWith("/welcome") || path.startsWith("/auth")) return;
      // Wait for cookie consent to be resolved before opening any dialog.
      if (!localStorage.getItem("cookie_consent")) {
        setTimeout(() => !cancelled && attempt(), 1500);
        return;
      }


      const { data, error } = await supabase
        .from("app_changelog")
        .select("id, version, title, body_markdown, image_url, image_urls, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || error || !data) return;
      const latest = data as ChangelogEntry;

      if (localStorage.getItem(LS_SEEN_PREFIX + latest.version) === "1") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("changelog_seen_version")
          .eq("user_id", user.id)
          .maybeSingle();
        if ((prof as any)?.changelog_seen_version === latest.version) {
          localStorage.setItem(LS_SEEN_PREFIX + latest.version, "1");
          return;
        }
      }

      setEntry(latest);
      setTimeout(() => {
        if (cancelled) return;
        setOpen(true);
        import("@amplitude/unified")
          .then((amp) => amp.track("changelog_popup_view", { version: latest.version }))
          .catch(() => {});
      }, 600);
    };

    attempt();
    return () => { cancelled = true; };
  }, []);

  const dismiss = async () => {
    if (entry) {
      localStorage.setItem(LS_SEEN_PREFIX + entry.version, "1");
      if (userId) {
        try {
          await supabase
            .from("profiles")
            .update({ changelog_seen_version: entry.version } as any)
            .eq("user_id", userId);
        } catch { /* ignore */ }
      }
      import("@amplitude/unified")
        .then((amp) => amp.track("changelog_popup_dismissed", { version: entry.version }))
        .catch(() => {});
    }
    setOpen(false);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-border/60">
        {images.length > 0 && (
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-lg bg-muted/20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={images[imgIdx]}
                src={images[imgIdx]}
                alt={`${entry.title} ${imgIdx + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent pointer-events-none" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border border-border/40 backdrop-blur-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border border-border/40 backdrop-blur-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImgIdx(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-foreground" : "w-1.5 bg-foreground/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="relative p-6 space-y-4">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">
                <Sparkles className="h-3 w-3" />
                v{entry.version}
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What's new</p>
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">{entry.title}</DialogTitle>
            <DialogDescription asChild>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed"
              >
                {entry.body_markdown}
              </motion.div>
            </DialogDescription>
          </DialogHeader>

          <Button onClick={dismiss} className="w-full" size="lg">Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
