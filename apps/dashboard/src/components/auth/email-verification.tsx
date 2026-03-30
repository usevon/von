"use client";

import { Button, Spinner, toast } from "@usevon/ui";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "@/lib/auth/client";

const COOLDOWN_SECONDS = 60;

type EmailVerificationProps = {
  email: string;
  title: string;
  description: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: React.ReactNode;
};

export const EmailVerification = ({
  email,
  title,
  description,
  onBack,
  backLabel = "Go back",
  footer,
}: EmailVerificationProps) => {
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    setIsResending(true);
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
      setIsResending(false);
    }
  }, [email]);

  const isDisabled = isResending || cooldown > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {description}{" "}
          <strong className="text-foreground">{email}</strong>
        </p>
      </div>
      <Button
        className="w-full"
        disabled={isDisabled}
        onClick={handleResend}
        variant="outline"
      >
        {(() => {
          if (isResending) {
            return (
              <>
                <Spinner className="size-4" />
                Sending...
              </>
            );
          }
          if (cooldown > 0) {
            return `Resend in ${cooldown}s`;
          }
          return "Resend verification email";
        })()}
      </Button>
      {onBack ? (
        <Button className="w-full" onClick={onBack} variant="ghost">
          {backLabel}
        </Button>
      ) : null}
      {footer}
    </div>
  );
};
