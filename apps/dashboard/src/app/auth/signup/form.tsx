"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, FieldError, FieldLabel, Form, Input } from "@usevon/ui";

import { signUp } from "@/lib/auth/client";

export const SignupForm = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValid = name.length > 0 && email.length > 0 && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!name) fieldErrors.name = "Name is required";
    if (!email) fieldErrors.email = "Email is required";
    if (!password) fieldErrors.password = "Password is required";
    else if (password.length < 8) fieldErrors.password = "Password must be at least 8 characters";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsPending(true);

    await signUp.email({ name, email, password }, {
      onSuccess: () => router.push("/"),
      onError: (ctx) => {
        const msg = ctx.error.message?.toLowerCase() ?? "";
        if (msg.includes("email") || msg.includes("user")) {
          setErrors({ email: ctx.error.message ?? "Email already in use" });
        } else if (msg.includes("password")) {
          setErrors({ password: ctx.error.message ?? "Invalid password" });
        } else {
          setErrors({ email: ctx.error.message ?? "Failed to create account" });
        }
        setIsPending(false);
      },
    });
  };

  return (
    <Form errors={errors} onSubmit={handleSubmit}>
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input
          autoComplete="name"
          disabled={isPending}
          name="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          type="text"
          value={name}
        />
        <FieldError />
      </Field>
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
          autoComplete="new-password"
          disabled={isPending}
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password (min 8 chars)"
          type="password"
          value={password}
        />
        <FieldError />
      </Field>
      <Button className="w-full" disabled={!isValid || isPending} type="submit">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
    </Form>
  );
};
