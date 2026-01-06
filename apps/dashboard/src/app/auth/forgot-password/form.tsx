"use client";

import { useState } from "react";

import { Button, Field, FieldError, FieldLabel, Form, Input } from "@usevon/ui";

import { authClient } from "@/lib/auth/client";

export const ForgotPasswordForm = () => {
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");

  const isValid = email.length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }

    setIsPending(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
    } finally {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <p className="text-sm">
          If an account exists for that email, you&apos;ll receive a password reset link shortly.
        </p>
      </div>
    );
  }

  return (
    <Form errors={errors} onSubmit={handleSubmit}>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input
          autoComplete="email"
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <FieldError />
      </Field>
      <Button className="w-full" disabled={!isValid || isPending} type="submit">
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
    </Form>
  );
};
