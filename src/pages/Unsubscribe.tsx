import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(
            token,
          )}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (data.valid) setState({ kind: "valid" });
        else if (data.reason === "already_unsubscribed")
          setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch {
        setState({ kind: "invalid" });
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } },
      );
      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }
      if (data?.success) setState({ kind: "done" });
      else if (data?.reason === "already_unsubscribed")
        setState({ kind: "already" });
      else setState({ kind: "error", message: "Could not unsubscribe" });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? "Unknown error" });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 text-center space-y-5 rounded-3xl">
        {state.kind === "loading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Checking your link…</h1>
          </>
        )}
        {state.kind === "valid" && (
          <>
            <MailX className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">Unsubscribe from Rejn emails?</h1>
            <p className="text-muted-foreground text-sm">
              You'll stop receiving morning weather reviews and other emails from us.
            </p>
            <Button onClick={confirm} className="w-full" size="lg">
              Confirm unsubscribe
            </Button>
          </>
        )}
        {state.kind === "submitting" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Unsubscribing…</h1>
          </>
        )}
        {state.kind === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">You're unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              You won't receive Rejn emails anymore. You can re-enable notifications
              anytime in the app settings.
            </p>
          </>
        )}
        {state.kind === "already" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">Already unsubscribed</h1>
            <p className="text-muted-foreground text-sm">
              This email address is already removed from our list.
            </p>
          </>
        )}
        {state.kind === "invalid" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-2xl font-semibold">Invalid or expired link</h1>
            <p className="text-muted-foreground text-sm">
              This unsubscribe link is no longer valid. Please use the link from a
              recent Rejn email.
            </p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">{state.message}</p>
            <Button onClick={confirm} variant="outline" className="w-full">
              Try again
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
