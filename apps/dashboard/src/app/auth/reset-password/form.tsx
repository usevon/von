"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, FieldError, FieldLabel, Form, Input } from "@usevon/ui";

import { authClient } from "@/lib/auth/client";

type ResetPasswordFormProps = {
  token: string;
};

export const ResetPasswordForm = (props: ResetPasswordFormProps) => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [password, setPassword] = useState("");

  const isValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!props.token) {
      setErrors({ password: "Invalid or expired reset link" });
      return;
    }

    if (!password) {
      setErrors({ password: "Password is required" });
      return;
    }

    if (password.length < 8) {
      setErrors({ password: "Password must be at least 8 characters" });
      return;
    }

    setIsPending(true);

    await authClient.resetPassword({
      newPassword: password,
      token: props.token,
    }, {
      onSuccess: () => router.push("/auth/login"),
      onError: (ctx) => {
        setErrors({ password: ctx.error.message ?? "Invalid or expired reset link" });
        setIsPending(false);
      },
    });
  };

  return (
    <Form errors={errors} onSubmit={handleSubmit}>
      <Field name="password">
        <FieldLabel>New password</FieldLabel>
        <Input
          autoComplete="new-password"
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your new password (min 8 chars)"
          type="password"
          value={password}
        />
        <FieldError />
      </Field>
      <Button className="w-full" disabled={!isValid || isPending} type="submit">
        {isPending ? "Resetting..." : "Reset password"}
      </Button>
    </Form>
  );
};
