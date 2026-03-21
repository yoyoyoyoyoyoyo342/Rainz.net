import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as amplitude from "@amplitude/unified";
import { useAuth } from "./use-auth";

const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], input[type='button'], input[type='submit'], input[type='reset'], [data-amplitude-event]";

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 140);

const getElementLabel = (element: Element) => {
  const customLabel = element.getAttribute("data-amplitude-label");
  const ariaLabel = element.getAttribute("aria-label");
  const title = element.getAttribute("title");
  const text = normalizeText(element.textContent || "");

  return customLabel || ariaLabel || title || text || "unknown";
};

const getErrorMessage = (value: unknown) => {
  if (!value) return "unknown_error";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function useAmplitudeInstrumentation() {
  const location = useLocation();
  const { user } = useAuth();

  const safeTrack = (eventName: string, payload: Record<string, unknown>) => {
    try {
      amplitude.track(eventName, payload);
    } catch {
      // Never block UX if analytics fails
    }
  };

  useEffect(() => {
    safeTrack("page_viewed", {
      page_path: location.pathname,
      page_query: location.search || null,
      page_hash: location.hash || null,
      user_id: user?.id || null,
    });
  }, [location.pathname, location.search, location.hash, user?.id]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const interactive = target?.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;

      const tag = interactive.tagName.toLowerCase();
      const href =
        interactive instanceof HTMLAnchorElement
          ? interactive.href || interactive.getAttribute("href")
          : interactive.getAttribute("href");

      const customEvent = interactive.getAttribute("data-amplitude-event");

      safeTrack(customEvent || "ui_interaction", {
        page_path: location.pathname,
        element_tag: tag,
        element_id: interactive.id || null,
        element_role: interactive.getAttribute("role") || null,
        element_label: getElementLabel(interactive),
        destination: href || null,
        user_id: user?.id || null,
      });
    };

    const handleSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;

      safeTrack("form_submit", {
        page_path: location.pathname,
        form_id: form.id || null,
        form_name: form.getAttribute("name") || null,
        user_id: user?.id || null,
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      safeTrack("client_runtime_error", {
        page_path: location.pathname,
        message: getErrorMessage(event.error || event.message),
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
        user_id: user?.id || null,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      safeTrack("client_unhandled_rejection", {
        page_path: location.pathname,
        message: getErrorMessage(event.reason),
        user_id: user?.id || null,
      });
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [location.pathname, user?.id]);
}