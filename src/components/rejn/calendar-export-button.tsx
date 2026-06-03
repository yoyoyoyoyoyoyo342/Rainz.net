import { useState } from "react";
import { Calendar, Check } from "lucide-react";
import { DailyForecast } from "@/types/weather";
import { toast } from "sonner";

interface Props {
  dailyForecast: DailyForecast[];
  location: string;
  isImperial?: boolean;
}

function buildICS(daily: DailyForecast[], location: string, isImperial: boolean) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const now = new Date();
  const stamp = `${fmt(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = daily.slice(0, 15).map((day, i) => {
    const start = new Date();
    start.setDate(start.getDate() + i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const high = isImperial ? day.highTemp : Math.round(((day.highTemp - 32) * 5) / 9);
    const low = isImperial ? day.lowTemp : Math.round(((day.lowTemp - 32) * 5) / 9);
    const unit = isImperial ? "F" : "C";
    const title = `${day.condition} · ${high}°/${low}°${unit}`;
    const desc = `${day.description || day.condition}\\nPrecipitation: ${day.precipitation}%\\nLocation: ${location}`;
    return [
      "BEGIN:VEVENT",
      `UID:rejn-${stamp}-${i}@rejn.net`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fmt(start)}`,
      `DTEND;VALUE=DATE:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${location}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rejn//Weather Forecast//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function CalendarExportButton({ dailyForecast, location, isImperial = true }: Props) {
  const [done, setDone] = useState(false);

  const handleExport = () => {
    try {
      const ics = buildICS(dailyForecast, location, isImperial);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rejn-forecast-${location.replace(/\s+/g, "-").toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      toast.success("Calendar downloaded — open it to add to Apple/Google Calendar");
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      toast.error("Couldn't export calendar");
    }
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-colors"
      aria-label="Export 15-day forecast to calendar"
    >
      {done ? <Check className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
      {done ? "Saved" : "Add to Calendar"}
    </button>
  );
}
