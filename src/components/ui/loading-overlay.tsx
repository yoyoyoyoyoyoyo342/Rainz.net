import { Skeleton } from "@/components/ui/skeleton";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({
  isOpen,
  message = "Loading",
  submessage = "Please wait a moment...",
}: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background p-4 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{message}</h3>
          <p className="text-xs text-muted-foreground">{submessage}</p>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
          </div>
        </div>
        <WeatherPageSkeleton />
      </div>
    </div>
  );
}
