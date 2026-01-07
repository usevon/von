"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Button, Field, FieldLabel, FieldMessage, FieldDescription, Form, Input, toast } from "@usevon/ui";

import { organization } from "@/lib/auth/client";

const generateSlug = (name: string) => {
  const base = name.toLowerCase().trim().replace(/\s+/g, "-");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
};

export const OnboardingForm = () => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const trimmedName = value.name.trim();
        const slug = generateSlug(trimmedName);

        const { data, showSuccess, showError } = await toast.timed(
          () => organization.create({ name: trimmedName, slug }),
          { loading: "Creating team..." }
        );

        if (data.error) {
          showError(data.error.message || "Failed to create team");
          return;
        }

        showSuccess("Team created!");
        router.push(`/${slug}`);
      } catch {
        toast.error("Something went wrong");
      }
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value.trim()) return "Team name is required";
            if (value.trim().length < 4) return "Team name must be at least 4 characters";
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>Team name</FieldLabel>
            <Input
              autoComplete="organization"
              autoFocus
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Acme Inc."
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            ) : (
              <FieldDescription>Must be at least 4 characters</FieldDescription>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        name: state.values.name,
      })}>
        {(state) => (
          <Button
            className="w-full"
            disabled={!state.canSubmit || !state.name.trim() || state.name.trim().length < 4 || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? "Creating team..." : "Create team"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
