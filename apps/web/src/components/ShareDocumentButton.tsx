"use client";

import { AlertCircle, Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ShareStatus = "idle" | "copied" | "error";

type ShareDocumentButtonProps = {
  className?: string;
  label?: string;
};

const FEEDBACK_DURATION_MS = 2000;

const copyWithFallback = (value: string) => {
  const textArea = document.createElement("textarea");

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";

  document.body.appendChild(textArea);
  textArea.select();

  try {
    const didCopy = document.execCommand("copy");

    if (!didCopy) {
      throw new Error("Fallback clipboard copy failed");
    }
  } finally {
    textArea.remove();
  }
};

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      console.warn("Clipboard API copy failed, using fallback", error);
    }
  }

  copyWithFallback(value);
};

export function ShareDocumentButton({
  className = "",
  label = "Share",
}: ShareDocumentButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackTimer = () => {
    if (!timeoutRef.current) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const queueStatusReset = () => {
    clearFeedbackTimer();

    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
      timeoutRef.current = null;
    }, FEEDBACK_DURATION_MS);
  };

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await copyToClipboard(window.location.href);
      setStatus("copied");
    } catch (error) {
      console.error("Failed to copy document link", error);
      setStatus("error");
    } finally {
      queueStatusReset();
    }
  };

  useEffect(() => {
    return () => {
      clearFeedbackTimer();
    };
  }, []);

  const Icon =
    status === "copied" ? Check : status === "error" ? AlertCircle : Share2;
  const buttonLabel =
    status === "copied"
      ? "Link copied"
      : status === "error"
        ? "Copy failed"
        : label;

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-60 ${
        status === "copied"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : status === "error"
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
      } ${className}`}
      aria-live="polite"
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{buttonLabel}</span>
    </button>
  );
}

export default ShareDocumentButton;
