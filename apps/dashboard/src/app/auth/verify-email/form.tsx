"use client";

import { Button, Spinner, toast } from "@usevon/ui";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

type ResendVerificationProps = {
  email?: string;
};

export const ResendVerification = ({ email }: ResendVerificationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("No email provided", "Please sign up again");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/",
      });

      setHasSent(true);
      toast.success("Email sent", "Check your inbox for the verification link");
    } catch {
      toast.error("Failed to resend", "Please try again later");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      disabled={isLoading || hasSent}
      onClick={handleResend}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Spinner className="size-4" />
          Sending...
        </>
      ) : hasSent ? (
        "Verification email sent"
      ) : (
        "Resend verification email"
      )}
    </Button>
  );
};
