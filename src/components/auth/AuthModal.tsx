"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

export function AuthModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const authModal = searchParams.get("authModal");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [prevAuthModal, setPrevAuthModal] = useState<string | null>(authModal);

  if (authModal !== prevAuthModal) {
    setPrevAuthModal(authModal);
    if (authModal === "signin" || authModal === "signup") {
      setMode(authModal);
    }
  }

  useEffect(() => {
    if (authModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [authModal]);

  if (!authModal) return null;

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("authModal");
    params.delete("redirect");
    params.delete("action");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="mb-6 text-2xl font-bold text-ink">
          {mode === "signin" ? "Sign In" : "Create an Account"}
        </h2>

        {mode === "signin" ? (
          <SignInForm onSignupClick={() => setMode("signup")} />
        ) : (
          <SignUpForm onSigninClick={() => setMode("signin")} />
        )}
      </div>
    </div>
  );
}
