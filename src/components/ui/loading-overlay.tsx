import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2 text-center">
          <h3 className="text-base font-semibold text-foreground">{message}</h3>
          <p className="text-sm text-muted-foreground">{submessage}</p>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
