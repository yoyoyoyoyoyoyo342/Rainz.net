import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Loader2 } from "lucide-react";

interface Entry {
  id: string;
  version: string;
  title: string;
  body_markdown: string;
  image_url: string | null;
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
  const [imageUrl, setImageUrl] = useState("");
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

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `changelog/${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("blog_images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("blog_images").getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
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
      image_url: imageUrl || null,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Changelog published");
    setVersion(""); setTitle(""); setBody(""); setImageUrl(""); setPublish(true);
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
          <Label className="text-xs">Cover image (optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="preview" className="mt-2 h-24 rounded-lg object-cover border border-border/40" />
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
