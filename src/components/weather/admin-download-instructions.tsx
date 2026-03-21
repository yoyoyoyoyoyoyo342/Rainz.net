import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function AdminDownloadInstructions() {
  const { getValue, setValue } = useFeatureFlags();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [macUrl, setMacUrl] = useState("");
  const [winUrl, setWinUrl] = useState("");
  const [macVersion, setMacVersion] = useState("");
  const [winVersion, setWinVersion] = useState("");
  const [macInstructions, setMacInstructions] = useState("");
  const [mobileTitle, setMobileTitle] = useState("");
  const [mobileDescription, setMobileDescription] = useState("");
  const [mobileCta, setMobileCta] = useState("");

  useEffect(() => {
    setMacUrl(getValue("download_mac_url", "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.V1.0.dmg"));
    setWinUrl(getValue("download_win_url", "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.Setup.V1.0.exe"));
    setMacVersion(getValue("download_mac_version", "1.0.0"));
    setWinVersion(getValue("download_win_version", "1.0.0"));
    setMacInstructions(getValue("download_mac_instructions", "Download the .dmg file above.\nTry to open the app. macOS will block it.\nOpen System Settings → Privacy & Security.\nAt the bottom, you'll see \"Rainz Weather was blocked\" → click Open Anyway.\nConfirm the prompt. Now Rainz Weather will open normally."));
    setMobileTitle(getValue("download_mobile_title", "Prefer not to download?"));
    setMobileDescription(getValue("download_mobile_description", 'You can install Rainz directly from your browser. Visit rainz.net and select "Add to Home Screen" or "Install App" in your browser menu.'));
    setMobileCta(getValue("download_mobile_cta", "Install from Browser"));
  }, [getValue]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setValue("download_mac_url", macUrl.trim()),
        setValue("download_win_url", winUrl.trim()),
        setValue("download_mac_version", macVersion.trim()),
        setValue("download_win_version", winVersion.trim()),
        setValue("download_mac_instructions", macInstructions.trim()),
        setValue("download_mobile_title", mobileTitle.trim()),
        setValue("download_mobile_description", mobileDescription.trim()),
        setValue("download_mobile_cta", mobileCta.trim()),
      ]);
      toast({ title: "Download instructions updated" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">macOS Download URL</Label>
          <Input value={macUrl} onChange={(e) => setMacUrl(e.target.value)} className="text-xs h-8" placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Windows Download URL</Label>
          <Input value={winUrl} onChange={(e) => setWinUrl(e.target.value)} className="text-xs h-8" placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">macOS Version</Label>
          <Input value={macVersion} onChange={(e) => setMacVersion(e.target.value)} className="text-xs h-8" placeholder="1.0.0" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Windows Version</Label>
          <Input value={winVersion} onChange={(e) => setWinVersion(e.target.value)} className="text-xs h-8" placeholder="1.0.0" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">macOS Bypass Instructions (one step per line)</Label>
        <Textarea
          value={macInstructions}
          onChange={(e) => setMacInstructions(e.target.value)}
          rows={5}
          className="text-xs"
          placeholder="Step 1...&#10;Step 2..."
        />
      </div>

      <div className="border-t border-border/30 pt-4 mt-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">📱 Mobile / PWA Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Mobile Section Title</Label>
            <Input value={mobileTitle} onChange={(e) => setMobileTitle(e.target.value)} className="text-xs h-8" placeholder="Prefer not to download?" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Mobile CTA Button Text</Label>
            <Input value={mobileCta} onChange={(e) => setMobileCta(e.target.value)} className="text-xs h-8" placeholder="Install from Browser" />
          </div>
        </div>
        <div className="space-y-2 mt-3">
          <Label className="text-xs">Mobile Section Description</Label>
          <Textarea
            value={mobileDescription}
            onChange={(e) => setMobileDescription(e.target.value)}
            rows={3}
            className="text-xs"
            placeholder="Describe how to install via browser..."
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving..." : "Save Instructions"}
      </Button>
    </div>
  );
}
