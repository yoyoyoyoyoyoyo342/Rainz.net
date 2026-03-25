import React from "react";
import { Button } from "@/components/ui/button";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";

interface RuntimeErrorBoundaryProps {
  children: React.ReactNode;
}

interface RuntimeErrorBoundaryState {
  hasError: boolean;
  message: string;
  isRecovering: boolean;
}

const CHUNK_RELOAD_KEY = "rainz-chunk-reload-attempted";
const RUNTIME_RECOVERY_KEY = "rainz-runtime-recovery-attempted";

const isChunkLoadError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk")
  );
};

export class RuntimeErrorBoundary extends React.Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  private recoveryTimer: number | null = null;

  state: RuntimeErrorBoundaryState = {
    hasError: false,
    message: "",
    isRecovering: false,
  };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Unknown runtime error",
      isRecovering: false,
    };
  }

  componentWillUnmount() {
    if (this.recoveryTimer !== null) {
      window.clearTimeout(this.recoveryTimer);
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RuntimeErrorBoundary caught error:", error, errorInfo);

    if (isChunkLoadError(error?.message || "")) {
      const alreadyRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
      if (!alreadyRetried) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
      }
      return;
    }

    const alreadyRecovered = sessionStorage.getItem(RUNTIME_RECOVERY_KEY) === "1";
    if (!alreadyRecovered) {
      sessionStorage.setItem(RUNTIME_RECOVERY_KEY, "1");
      this.setState({ isRecovering: true });

      this.recoveryTimer = window.setTimeout(() => {
        this.setState({ hasError: false, message: "", isRecovering: false });
      }, 700);
    }
  }

  handleReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    sessionStorage.removeItem(RUNTIME_RECOVERY_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <WeatherPageSkeleton />
        <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card/90 p-4 text-center space-y-3">
          <h2 className="text-base font-semibold">{this.state.isRecovering ? "Recovering app..." : "We hit a loading issue"}</h2>
          <p className="text-xs text-muted-foreground">
            {this.state.isRecovering
              ? "Trying a safe reload path now."
              : "Tap reload if this screen stays visible."}
          </p>
          {!this.state.isRecovering && (
            <Button onClick={this.handleReload} className="w-full">
              Reload app
            </Button>
          )}
        </div>
      </div>
    );
  }
}
