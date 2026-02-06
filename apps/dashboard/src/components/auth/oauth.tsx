"use client";

import { useState } from "react";

import { Button, Spinner, toast } from "@usevon/ui";

import { signIn } from "@/lib/auth/client";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
      fill="#EA4335"
    />
    <path
      d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
      fill="#4285F4"
    />
    <path
      d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
      fill="#FBBC05"
    />
    <path
      d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
      fill="#34A853"
    />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 98 96" aria-hidden="true" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
    />
  </svg>
);

type OAuthButtonsProps = {
  redirectTo?: string;
  mode?: "login" | "signup";
};

export const OAuthButtons = ({ redirectTo, mode }: OAuthButtonsProps) => {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
  const successMessage = mode === "signup" ? "Account created!" : "Welcome back!";
  const isLoading = loadingProvider !== null;

  const handleGoogleSignIn = async () => {
    setLoadingProvider("google");
    await signIn.social(
      {
        provider: "google",
        callbackURL: `${window.location.origin}${redirectTo || "/"}`,
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || "Failed to sign in with Google");
          setLoadingProvider(null);
        },
      },
    );
  };

  const handleGitHubSignIn = async () => {
    setLoadingProvider("github");
    await signIn.social(
      {
        provider: "github",
        callbackURL: `${window.location.origin}${redirectTo || "/"}`,
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || "Failed to sign in with GitHub");
          setLoadingProvider(null);
        },
      },
    );
  };

  return (
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1" onClick={handleGoogleSignIn} disabled={isLoading}>
        {loadingProvider === "google" ? <Spinner className="size-4" /> : <GoogleIcon className="size-4" />}
        Google
      </Button>
      <Button variant="outline" className="flex-1" onClick={handleGitHubSignIn} disabled={isLoading}>
        {loadingProvider === "github" ? <Spinner className="size-4" /> : <GitHubIcon className="size-4" />}
        GitHub
      </Button>
    </div>
  );
};
