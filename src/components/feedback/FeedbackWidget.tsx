"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FaFaceTired,
  FaFaceFrown,
  FaFaceMeh,
  FaFaceSmile,
  FaFaceLaughBeam,
} from "react-icons/fa6";
import { cn } from "@/lib/utils/utils";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";

type Status = "idle" | "submitting" | "success" | "error";

const RATINGS = [
  { value: 1, label: "Terrible", Icon: FaFaceTired },
  { value: 2, label: "Bad", Icon: FaFaceFrown },
  { value: 3, label: "Okay", Icon: FaFaceMeh },
  { value: 4, label: "Good", Icon: FaFaceSmile },
  { value: 5, label: "Amazing", Icon: FaFaceLaughBeam },
] as const;

const MAX_MESSAGE_LENGTH = 3000;

/**
 * Site-wide "rate your experience" widget:
 * - Desktop: Docked tab on the left edge of the viewport that slides out from the left.
 * - Mobile: Docked button at the bottom that slides up smoothly from the bottom.
 */
export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const locale = useCurrentLocale();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function closeAndReset() {
    setIsOpen(false);
    setRating(null);
    setStatus("idle");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rating) {
      setError("Please choose a rating.");
      return;
    }

    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          contactable: data.get("contactable") === "on",
          website: data.get("website"),
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      {/* Mobile Center Bottom Docked Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-0 left-1/2 -translate-x-1/2 z-40",
            "flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none",
            "bg-ink px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow-2xl",
            "transition-all active:scale-95 border-t border-x border-white/20 sm:hidden"
          )}
          aria-label="Rate your experience"
        >
          <span>Rate your experience</span>
        </button>
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={closeAndReset}
      />

      {/* Modal / Sheet Container: Bottom sheet on mobile, Left drawer on desktop */}
      <div className={cn("pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:justify-start overflow-hidden")}>
        <div
          role="dialog"
          aria-modal={isOpen ? "true" : undefined}
          aria-labelledby="feedback-heading"
          className={`pointer-events-auto relative flex h-auto max-h-[85dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:h-[72vh] sm:max-h-[72vh] sm:max-w-md sm:rounded-r-2xl sm:rounded-tl-none ${
            isOpen
              ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:-translate-x-full"
          }`}
        >
          {/* Desktop Attached Toggle Tab */}
          <button
            type="button"
            onClick={() => (isOpen ? closeAndReset() : setIsOpen(true))}
            className={cn(
              "absolute right-0 top-1/2 translate-x-full -translate-y-1/2 rounded-r-lg",
              "bg-ink px-2 py-4 text-xs font-semibold tracking-wide text-white shadow-lg",
              "transition-colors hover:bg-black hidden sm:block"
            )}
            aria-label={isOpen ? "Close feedback panel" : "Rate your experience"}
          >
            <span className="[writing-mode:vertical-rl]">
              {isOpen ? "Close window" : "Rate your experience"}
            </span>
          </button>

          {/* Sheet/Drawer Content */}
          <div className="flex flex-col overflow-y-auto p-4 sm:p-6 pb-6 sm:pb-6">
            {/* Header row with mobile close button */}
            <div className="flex items-center justify-between">
              <h2 id="feedback-heading" className="text-lg sm:text-xl font-bold text-ink">
                Your Opinion Matters&hellip;
              </h2>
              <button
                type="button"
                onClick={closeAndReset}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-gray-100 hover:text-ink sm:hidden"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {status === "success" ? (
              <p className="mt-4 sm:mt-6 rounded-md border border-border bg-accent-soft p-4 text-sm text-ink">
                Thanks for your feedback &mdash; we really appreciate you taking the time.
              </p>
            ) : (
              <>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-ink-muted">
                  How would you rate your experience? We&rsquo;d love to hear your thoughts!
                </p>

                <form onSubmit={handleSubmit} className="mt-3 sm:mt-5 space-y-2.5 sm:space-y-4">
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Rating">
                    {RATINGS.map(({ value, label, Icon }) => {
                      const selected = rating === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            setRating(value);
                            setError(null);
                          }}
                          className={`flex flex-col items-center gap-1 rounded-md border p-1.5 sm:p-2 text-center transition-colors ${
                            selected
                              ? "border-accent bg-accent-soft text-accent-dark"
                              : "border-border text-ink-muted hover:border-accent hover:text-accent"
                          }`}
                        >
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="text-[10px] sm:text-[11px] font-medium leading-tight">{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label htmlFor="feedback-name" className="mb-1 block text-xs sm:text-sm font-medium text-ink">
                        Name <span className="text-accent">*</span>
                      </label>
                      <input
                        id="feedback-name"
                        name="name"
                        type="text"
                        required
                        maxLength={100}
                        placeholder="Your name..."
                        className="w-full rounded-md border border-border px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-ink"
                      />
                    </div>

                    <div>
                      <label htmlFor="feedback-email" className="mb-1 block text-xs sm:text-sm font-medium text-ink">
                        Email <span className="text-accent">*</span>
                      </label>
                      <input
                        id="feedback-email"
                        name="email"
                        type="email"
                        required
                        placeholder="Your email..."
                        className="w-full rounded-md border border-border px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="feedback-message" className="mb-1 block text-xs sm:text-sm font-medium text-ink">
                      What are the main reasons for your rating?
                    </label>
                    <textarea
                      id="feedback-message"
                      name="message"
                      rows={2}
                      maxLength={MAX_MESSAGE_LENGTH}
                      placeholder="Please share your feedback..."
                      className="w-full rounded-md border border-border px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-ink"
                    />
                  </div>

                  {/* Honeypot */}
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="feedback-website">Website</label>
                    <input id="feedback-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                  </div>

                  <label className="flex items-start gap-2 text-xs sm:text-sm text-ink-muted">
                    <input
                      name="contactable"
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>
                      I may be contacted about this feedback.{" "}
                      <Link href={`/${locale.code}/privacy-policy`} className="text-accent hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  {error && (
                    <p role="alert" aria-live="polite" className="text-xs sm:text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full rounded-md bg-accent px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
                  >
                    {status === "submitting" ? "Submitting…" : "Submit"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
