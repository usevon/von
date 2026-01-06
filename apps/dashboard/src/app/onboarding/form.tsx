"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, FieldError, FieldLabel, Form, Input } from "@usevon/ui";

import { organization } from "@/lib/auth/client";

const generateSlug = (name: string) => {
  const base = name.toLowerCase().trim().replace(/\s+/g, "-");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
};

export const OnboardingForm = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");

  const isValid = name.trim().length >= 4;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrors({ name: "Team name is required" });
      return;
    }

    if (trimmedName.length < 4) {
      setErrors({ name: "Team name must be at least 4 characters" });
      return;
    }

    setIsPending(true);

    const slug = generateSlug(trimmedName);

    await organization.create({ name: trimmedName, slug }, {
      onSuccess: () => router.push(`/${slug}`),
      onError: (ctx) => {
        setErrors({ name: ctx.error.message ?? "Failed to create team" });
        setIsPending(false);
      },
    });
  };

  return (
    <Form errors={errors} onSubmit={handleSubmit}>
      <Field name="name">
        <FieldLabel>Team name</FieldLabel>
        <Input
          autoComplete="organization"
          autoFocus
          disabled={isPending}
          name="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          value={name}
        />
        <FieldError />
      </Field>
      <Button className="w-full" disabled={!isValid || isPending} type="submit">
        {isPending ? "Creating team..." : "Create team"}
      </Button>
    </Form>
  );
};
