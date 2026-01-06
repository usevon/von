"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Field, FieldError, FieldLabel, Form, Input } from "@usevon/ui";

import { signIn } from "@/lib/auth/client";

export const LoginForm = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValid = email.length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = "Email is required";
    if (!password) fieldErrors.password = "Password is required";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsPending(true);

    await signIn.email({ email, password }, {
      onSuccess: () => router.push("/"),
      onError: () => {
        setErrors({ email: "Invalid email", password: "Invalid password" });
        setIsPending(false);
      },
    });
  };

  return (
    <Form errors={errors} onSubmit={handleSubmit}>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input
          autoComplete="email"
          disabled={isPending}
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <FieldError />
      </Field>
      <Field name="password">
        <FieldLabel>Password</FieldLabel>
        <Input
          autoComplete="current-password"
          disabled={isPending}
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
        <FieldError />
      </Field>
      <div className="flex items-center justify-between">
        <Link
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
          href="/auth/forgot-password"
        >
          Forgot password?
        </Link>
      </div>
      <Button className="w-full" disabled={!isValid || isPending} type="submit">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </Form>
  );
};
