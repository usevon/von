"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, InputOTP, REGEXP_ONLY_DIGITS_AND_CHARS } from "@usevon/ui";

import { device, useSession } from "@/lib/auth/client";

type DeviceFormProps = {
  initialCode: string;
};

export const DeviceForm = (props: DeviceFormProps) => {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [userCode, setUserCode] = useState(props.initialCode);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState(false);

  if (sessionPending) {
    return null;
  }

  if (!session) {
    const returnUrl = `/device${userCode ? `?user_code=${userCode}` : ""}`;
    router.push(`/auth/login?redirect=${encodeURIComponent(returnUrl)}`);
    return null;
  }

  const handleApprove = async (code?: string) => {
    const finalCode = code || userCode;
    if (finalCode.length !== 8) {
      setError(true);
      return;
    }

    setStatus("loading");
    setError(false);

    const { error: approveError } = await device.approve({ userCode: finalCode });
    if (approveError) {
      setError(true);
      setStatus("idle");
      return;
    }
    router.push("/");
  };

  const handleDeny = async () => {
    if (userCode.length !== 8) {
      setError(true);
      return;
    }

    setStatus("loading");
    setError(false);

    await device.deny({ userCode });
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-4">
      <InputOTP
        disabled={status === "loading"}
        error={error}
        groupSize={4}
        maxLength={8}
        onChange={(v) => {
          setUserCode(v);
          setError(false);
        }}
        onComplete={handleApprove}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        value={userCode}
      />

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={status === "loading"}
          onClick={handleDeny}
          variant="outline"
        >
          Deny
        </Button>
        <Button
          className="flex-1"
          disabled={status === "loading" || userCode.length < 8}
          onClick={() => handleApprove()}
        >
          {status === "loading" ? "Authorizing..." : "Authorize"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Signed in as {session.user.email}
      </p>
    </div>
  );
};
