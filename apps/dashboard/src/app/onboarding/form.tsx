"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Form, toast } from "@usevon/ui";

import { TextField, SubmitButton, validators } from "@/components/form";
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
        validators={{ onChange: validators.minLength(4, "Team name must be at least 4 characters") }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Team name"
            description="Must be at least 4 characters"
            placeholder="Acme Inc."
            autoComplete="organization"
            autoFocus
            disabled={form.state.isSubmitting}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        name: state.values.name,
      })}>
        {(state) => (
          <SubmitButton
            className="w-full"
            canSubmit={state.canSubmit}
            isSubmitting={state.isSubmitting}
            hasEmptyFields={!state.name.trim() || state.name.trim().length < 4}
            loadingText="Creating team..."
          >
            Create team
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
