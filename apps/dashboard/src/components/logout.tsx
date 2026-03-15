"use client";

import { Button, Spinner, toastManager } from "@usevon/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/client";

type LogoutProps = {
  label?: string;
  loadingLabel?: string;
  size?: "sm" | "default" | "lg";
};

export const Logout = (props: LogoutProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const label = props.label ?? "Sign out";
  const loadingLabel = props.loadingLabel ?? "Signing out...";
  const size = props.size ?? "default";

  const handleLogout = async () => {
    setIsLoading(true);

    const { error } = await signOut();

    if (error) {
      toastManager.add({
        title: "Sign out failed",
        description: "Please try again",
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    router.push("/auth/login");
  };

  return (
    <Button
      disabled={isLoading}
      onClick={handleLogout}
      size={size}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
};
