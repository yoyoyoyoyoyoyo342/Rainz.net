import { Eye, Type, Sun, Contrast as ContrastIcon, Palette, MousePointer2, Sparkles, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useVisionPreferences,
  type VisionPreset,
  type ContrastMode,
  type ColorBlindMode,
  type CursorSize,
  type TextScale,
} from "@/hooks/use-vision-preferences";

const PRESET_OPTIONS: { id: VisionPreset; label: string; desc: string; emoji: string }[] = [
  { id: "standard", label: "Standard", desc: "No adjustments", emoji: "◯" },
  { id: "low-vision", label: "Low Vision", desc: "Bigger, bolder, high contrast", emoji: "🔍" },
  { id: "aniridia", label: "Aniridia / Photophobia", desc: "Warm, matte, high-legibility text", emoji: "🌒" },
  { id: "color-blind", label: "Color Blind", desc: "Adds patterns + underlines", emoji: "🎨" },
  { id: "screen-reader", label: "Screen Reader", desc: "Verbose labels, no motion", emoji: "🔊" },
];

// Local mirror of the SettingsSection wrapper used elsewhere, kept minimal.
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div id="vision" className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden scroll-mt-32">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/30">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-primary" aria-hidden />
        </div>
        <span className="font-semibold text-sm">Vision &amp; Accessibility</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-primary/80 font-semibold">New</span>
      </div>
      <div className="p-4 space-y-5">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 max-w-full">{children}</div>
    </div>
  );
}

export function VisionSettingsSection() {
  const { prefs, setPrefs, applyPreset, reset } = useVisionPreferences();

  return (
    <Section>
      {/* Preset picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden /> Vision profile
        </Label>
        <p className="text-xs text-muted-foreground">One-tap presets that configure everything below.</p>
        <div role="radiogroup" aria-label="Vision profile preset" className="grid grid-cols-1 gap-2 pt-1">
          {PRESET_OPTIONS.map((opt) => {
            const active = prefs.preset === opt.id;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={active}
                onClick={() => applyPreset(opt.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text size */}
      <Row label="Text size" description="Scales the whole app.">
        <select
          aria-label="Text size"
          value={prefs.textScale}
          onChange={(e) => setPrefs({ textScale: Number(e.target.value) as TextScale })}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm sm:w-auto"
        >
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
          <option value={200}>200%</option>
        </select>
      </Row>

      {/* Contrast */}
      <Row label="Contrast">
        <select
          aria-label="Contrast level"
          value={prefs.contrast}
          onChange={(e) => setPrefs({ contrast: e.target.value as ContrastMode })}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm sm:w-auto"
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="max">Maximum</option>
        </select>
      </Row>

      {/* Brightness dimmer */}
      <div className="space-y-2">
        <Row label="Reduce brightness" description="Dims the whole screen — helps with light sensitivity.">
          <span className="text-xs font-mono tabular-nums w-10 text-right">{prefs.brightness}%</span>
        </Row>
        <input
          type="range"
          aria-label="Screen dim amount"
          min={0}
          max={70}
          step={10}
          value={prefs.brightness}
          onChange={(e) => setPrefs({ brightness: Number(e.target.value) as any })}
          className="w-full accent-primary"
        />
      </div>

      <Row label="Warm filter" description="Reduces blue light glare.">
        <Switch checked={prefs.warmFilter} onCheckedChange={(v) => setPrefs({ warmFilter: v })} aria-label="Warm filter" />
      </Row>

      <Row label="Reduce transparency" description="Turns glassy cards into solid ones.">
        <Switch checked={prefs.reduceTransparency} onCheckedChange={(v) => setPrefs({ reduceTransparency: v })} aria-label="Reduce transparency" />
      </Row>

      <Row label="Reduce motion" description="Removes animations and transitions.">
        <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => setPrefs({ reduceMotion: v })} aria-label="Reduce motion" />
      </Row>

      <Row label="Bold text" description="Makes every text heavier.">
        <Switch checked={prefs.boldText} onCheckedChange={(v) => setPrefs({ boldText: v })} aria-label="Bold text" />
      </Row>

      <Row label="Underline links" description="Adds an underline to every link.">
        <Switch checked={prefs.underlineLinks} onCheckedChange={(v) => setPrefs({ underlineLinks: v })} aria-label="Underline links" />
      </Row>

      <Row label="Thick focus ring" description="Big yellow ring around focused controls.">
        <Switch checked={prefs.thickFocus} onCheckedChange={(v) => setPrefs({ thickFocus: v })} aria-label="Thick focus ring" />
      </Row>

      <Row label="Color blind mode">
        <select
          aria-label="Color blind mode"
          value={prefs.colorBlind}
          onChange={(e) => setPrefs({ colorBlind: e.target.value as ColorBlindMode })}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm sm:w-auto"
        >
          <option value="none">Off</option>
          <option value="deuteranopia">Deuteranopia</option>
          <option value="protanopia">Protanopia</option>
          <option value="tritanopia">Tritanopia</option>
        </select>
      </Row>

      <Row label="Cursor size">
        <select
          aria-label="Cursor size"
          value={prefs.cursorSize}
          onChange={(e) => setPrefs({ cursorSize: e.target.value as CursorSize })}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm sm:w-auto"
        >
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="huge">Huge</option>
        </select>
      </Row>

      <Row label="Screen reader mode" description="Adds verbose labels and live regions.">
        <Switch checked={prefs.screenReaderMode} onCheckedChange={(v) => setPrefs({ screenReaderMode: v })} aria-label="Screen reader mode" />
      </Row>

      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Settings save automatically on this device.</p>
        <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset vision settings">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
        </Button>
      </div>
    </Section>
  );
}
