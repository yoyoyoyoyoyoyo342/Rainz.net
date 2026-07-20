import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Loader2, X, ArrowUp, ArrowDown } from "lucide-react";

interface Entry {
  id: string;
  version: string;
  title: string;
  body_markdown: string;
  image_url: string | null;
  image_urls: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export function AdminChangelog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [publish, setPublish] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_changelog")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleImages = async (files: FileList) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const path = `changelog/${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("blog_images").upload(path, file);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("blog_images").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      setImageUrls((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImageUrls((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = async () => {
    if (!version.trim() || !title.trim() || !body.trim()) {
      toast.error("Version, title and body are required");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_changelog").insert({
      version: version.trim(),
      title: title.trim(),
      body_markdown: body,
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Changelog published");
    setVersion(""); setTitle(""); setBody(""); setImageUrls([]); setPublish(true);
    load();
  };

  const togglePublish = async (e: Entry) => {
    const next = !e.is_published;
    const { error } = await supabase
      .from("app_changelog")
      .update({ is_published: next, published_at: next ? new Date().toISOString() : null } as any)
      .eq("id", e.id);
    if (error) toast.error(error.message);
    else { toast.success(next ? "Published" : "Unpublished"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this changelog entry?")) return;
    const { error } = await supabase.from("app_changelog").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 p-5 space-y-4 bg-card/40">
        <h3 className="text-sm font-semibold">New changelog entry</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cl-version" className="text-xs">Version</Label>
            <Input id="cl-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.1.0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-title" className="text-xs">Title</Label>
            <Input id="cl-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rejn 2.1 — Landmarks & onboarding" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cl-body" className="text-xs">Body</Label>
          <Textarea id="cl-body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="What did we change?" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Cover images (optional, first is used as thumbnail)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => e.target.files && e.target.files.length > 0 && handleImages(e.target.files)}
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {imageUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imageUrls.map((url, idx) => (
                <div key={url + idx} className="relative group rounded-lg overflow-hidden border border-border/40">
                  <img src={url} alt={`cover ${idx + 1}`} className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    <button type="button" onClick={() => moveImage(idx, -1)} className="p-1 rounded bg-background/80" aria-label="Move left"><ArrowUp className="h-3 w-3 rotate-[-90deg]" /></button>
                    <button type="button" onClick={() => moveImage(idx, 1)} className="p-1 rounded bg-background/80" aria-label="Move right"><ArrowDown className="h-3 w-3 rotate-[-90deg]" /></button>
                    <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded bg-destructive/90 text-white" aria-label="Remove"><X className="h-3 w-3" /></button>
                  </div>
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/80 font-mono">{idx + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={publish} onCheckedChange={setPublish} id="cl-pub" />
            <Label htmlFor="cl-pub" className="text-xs">Publish immediately</Label>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save entry
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 p-5 bg-card/40">
        <h3 className="text-sm font-semibold mb-3">Recent entries</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No changelog entries yet.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {entries.map((e) => (
              <li key={e.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{e.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">v{e.version}</span>
                    {(e.image_urls?.length ?? 0) > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{e.image_urls!.length} imgs</span>
                    )}
                    {e.is_published ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">live</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">draft</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.body_markdown}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(e)}>
                    {e.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
