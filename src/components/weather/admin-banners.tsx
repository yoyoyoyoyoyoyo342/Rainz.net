import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

interface Banner {
  id: string;
  title: string;
  message: string;
  background_color: string;
  text_color: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const PRESET_COLORS = [
  { bg: "#3b82f6", fg: "#ffffff", name: "Blue" },
  { bg: "#10b981", fg: "#ffffff", name: "Green" },
  { bg: "#f59e0b", fg: "#0a0a0a", name: "Amber" },
  { bg: "#ef4444", fg: "#ffffff", name: "Red" },
  { bg: "#8b5cf6", fg: "#ffffff", name: "Violet" },
  { bg: "#0f172a", fg: "#ffffff", name: "Slate" },
];

function todayIso(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [bg, setBg] = useState(PRESET_COLORS[0].bg);
  const [fg, setFg] = useState(PRESET_COLORS[0].fg);
  const [startsAt, setStartsAt] = useState(todayIso(0));
  const [endsAt, setEndsAt] = useState(todayIso(7));
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await (supabase as any)
      .from("app_banners")
      .select("*")
      .order("created_at", { ascending: false });
    setBanners((data || []) as Banner[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createBanner() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("app_banners").insert({
      title: title.trim(),
      message: message.trim(),
      background_color: bg,
      text_color: fg,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt + "T23:59:59").toISOString(),
      is_active: true,
      created_by: u.user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to create banner", { description: error.message });
      return;
    }
    toast.success("Banner created");
    setTitle("");
    setMessage("");
    load();
  }

  async function toggleActive(b: Banner) {
    await (supabase as any).from("app_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner?")) return;
    await (supabase as any).from("app_banners").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-card/40">
        <h3 className="text-sm font-semibold">Create new banner</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance window tonight" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional supporting text" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.bg}
                onClick={() => {
                  setBg(c.bg);
                  setFg(c.fg);
                }}
                className={`h-8 w-8 rounded-full border-2 transition-all ${bg === c.bg ? "border-foreground scale-110" : "border-border/40"}`}
                style={{ backgroundColor: c.bg }}
                title={c.name}
              />
            ))}
            <Input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-8 w-12 p-1 cursor-pointer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Starts</Label>
            <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ends</Label>
            <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: bg, color: fg }}>
          <div className="font-semibold">{title || "Preview title"}</div>
          {message && <div className="text-xs opacity-90">{message}</div>}
        </div>
        <Button onClick={createBanner} disabled={saving} className="gap-1.5 w-full">
          <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create banner"}
        </Button>
      </div>

      {/* Existing list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">All banners</h3>
        {banners.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No banners yet</p>
        )}
        {banners.map((b) => (
          <div key={b.id} className="rounded-xl border border-border/40 p-3 space-y-2">
            <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: b.background_color, color: b.text_color }}>
              <div className="font-semibold">{b.title}</div>
              {b.message && <div className="text-xs opacity-90">{b.message}</div>}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {format(new Date(b.starts_at), "MMM d")} → {format(new Date(b.ends_at), "MMM d, yyyy")}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Active</span>
                  <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteBanner(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
