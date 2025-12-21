"use client";

import {
  Button,
  Card,
  CardHeader,
  CardPanel,
  CardTitle,
  InputOTP,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@usevon/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { device, useSession } from "@/lib/auth/client";

type Status = "idle" | "verifying" | "processing";

export const DeviceAuthorization = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userCodeParam = searchParams.get("user_code");

  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string } | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (userCodeParam && session) {
      const formattedCode = userCodeParam.trim().replace(/-/g, "").toUpperCase();
      handleVerify(formattedCode);
    }
  }, [userCodeParam, session]);

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="mb-4 text-muted-foreground">
              You need to sign in to authorize a device.
            </p>
            <Button
              className="w-full"
              onClick={() =>
                router.push(`/test-auth?redirect=${encodeURIComponent(currentUrl)}`)
              }
            >
              Sign In
            </Button>
          </CardPanel>
        </Card>
      </div>
    );
  }

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? userCode;
    if (!codeToVerify.trim()) {
      return;
    }
    setError(false);
    setStatus("verifying");
    try {
      const formattedCode = codeToVerify.trim().replace(/-/g, "").toUpperCase();
      const { data, error: fetchError } = await device({
        query: { user_code: formattedCode },
      });
      if (fetchError || !data) {
        setError(true);
        return;
      }
      setDeviceInfo({ userCode: formattedCode });
    } catch {
      setError(true);
    } finally {
      setStatus("idle");
    }
  };

  const handleApprove = async () => {
    if (!deviceInfo) {
      return;
    }
    setStatus("processing");
    try {
      const { error: approveError } = await device.approve({
        userCode: deviceInfo.userCode,
      });
      if (approveError) {
        return;
      }
      router.push("/");
    } catch {
      // silently fail
    } finally {
      setStatus("idle");
    }
  };

  const handleDeny = async () => {
    if (!deviceInfo) {
      return;
    }
    setStatus("processing");
    try {
      await device.deny({ userCode: deviceInfo.userCode });
    } catch {
      // silently fail
    } finally {
      router.push("/");
    }
  };

  const title = deviceInfo ? "Authorize Device" : "Device Authorization";
  const description = deviceInfo
    ? "A device is requesting access to your account."
    : "Enter the code displayed on your device.";

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardPanel>
          <p className="mb-4 text-muted-foreground">{description}</p>
          <div className="mb-4 flex justify-center">
            <InputOTP
              disabled={!!deviceInfo}
              error={error}
              groupSize={4}
              maxLength={8}
              onChange={
                deviceInfo
                  ? undefined
                  : (v) => {
                      setUserCode(v);
                      setError(false);
                    }
              }
              onComplete={deviceInfo ? undefined : handleVerify}
              pattern={deviceInfo ? undefined : REGEXP_ONLY_DIGITS_AND_CHARS}
              value={deviceInfo?.userCode ?? userCode}
            />
          </div>
          <div className="flex justify-center gap-3">
            {deviceInfo ? (
              <>
                <Button
                  disabled={status === "processing"}
                  onClick={handleDeny}
                  variant="outline"
                >
                  Deny
                </Button>
                <Button
                  disabled={status === "processing"}
                  onClick={handleApprove}
                >
                  {status === "processing" ? "Processing..." : "Approve"}
                </Button>
              </>
            ) : (
              <Button
                disabled={status === "verifying" || userCode.length < 8}
                onClick={() => handleVerify()}
              >
                {status === "verifying" ? "Verifying..." : "Continue"}
              </Button>
            )}
          </div>
        </CardPanel>
      </Card>
    </div>
  );
};
