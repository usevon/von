"use client";

import { Button, Spinner, toast } from "@usevon/ui";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "@/lib/auth/client";

const COOLDOWN_SECONDS = 60;

type ResendVerificationProps = {
  email?: string;
};

export const ResendVerification = ({ email }: ResendVerificationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email) {
      toast.error("No email provided", "Please sign up again");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin,
      });

      setCooldown(COOLDOWN_SECONDS);
      toast.success("Email sent", "Check your inbox for the verification link");
    } catch {
      toast.error("Failed to resend", "Please try again later");
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const isDisabled = isLoading || cooldown > 0;

  return (
    <Button
      className="w-full"
      disabled={isDisabled}
      onClick={handleResend}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Spinner className="size-4" />
          Sending...
        </>
      ) : cooldown > 0 ? (
        `Resend in ${cooldown}s`
      ) : (
        "Resend verification email"
      )}
    </Button>
  );
};
