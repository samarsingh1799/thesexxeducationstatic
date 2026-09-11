"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa6";
import { authClient } from "@/lib/auth/client";

type SocialSignInButtonsProps = {
  redirectPath?: string;
  action?: string | null;
};

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-50";

export function SocialSignInButtons({ redirectPath = "/account", action }: SocialSignInButtonsProps) {
  const [isPending, setIsPending] = useState<"google" | "facebook" | null>(null);

  const callbackURL = action
    ? `${redirectPath}${redirectPath.includes("?") ? "&" : "?"}action=${encodeURIComponent(action)}`
    : redirectPath;

  async function handleSocialSignIn(provider: "google" | "facebook") {
    try {
      setIsPending(provider);
      await authClient.signIn.social({
        provider,
        callbackURL,
      });
    } catch (err) {
      console.error(`Failed to sign in with ${provider}:`, err);
      setIsPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending !== null}
        onClick={() => handleSocialSignIn("google")}
        className={buttonClass}
      >
        <FcGoogle className="h-5 w-5" />
        {isPending === "google" ? "Connecting to Google…" : "Continue with Google"}
      </button>
      <button
        type="button"
        disabled={isPending !== null}
        onClick={() => handleSocialSignIn("facebook")}
        className={buttonClass}
      >
        <FaFacebook className="h-5 w-5 text-[#1877F2]" />
        {isPending === "facebook" ? "Connecting to Facebook…" : "Continue with Facebook"}
      </button>
    </div>
  );
}
