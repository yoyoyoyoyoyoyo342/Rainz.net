import React from "react";
import { Button } from "@/components/ui/button";

interface RuntimeErrorBoundaryProps {
  children: React.ReactNode;
}

interface RuntimeErrorBoundaryState {
  hasError: boolean;
  message: string;
}

const CHUNK_RELOAD_KEY = "rainz-chunk-reload-attempted";

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
  state: RuntimeErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Unknown runtime error",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RuntimeErrorBoundary caught error:", error, errorInfo);

    if (isChunkLoadError(error?.message || "")) {
      const alreadyRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
      if (!alreadyRetried) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">We hit a loading issue</h2>
          <p className="text-sm text-muted-foreground">
            Rainz recovered from a runtime crash. Tap reload to continue.
          </p>
          <Button onClick={this.handleReload} className="w-full">
            Reload app
          </Button>
        </div>
      </div>
    );
  }
}
