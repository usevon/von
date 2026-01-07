"use client";

import { useForm } from "@tanstack/react-form";

import { Form, toast } from "@usevon/ui";

import { TextField, SubmitButton, validators } from "@/components/form";
import { authClient } from "@/lib/auth/client";

export const ForgotPasswordForm = () => {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, showSuccess, showError } = await toast.timed(
          () => authClient.requestPasswordReset({ email: value.email, redirectTo: "/auth/reset-password" }),
          { loading: "Sending reset link..." }
        );

        if (data.error) {
          showError(data.error.message || "Failed to send reset link");
          return;
        }

        showSuccess("If an account exists, you'll receive a reset link");
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
        name="email"
        validators={{ onChange: validators.compose(validators.required("Email is required"), validators.email()) }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            disabled={form.state.isSubmitting}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        email: state.values.email,
      })}>
        {(state) => (
          <SubmitButton
            className="w-full"
            canSubmit={state.canSubmit}
            isSubmitting={state.isSubmitting}
            hasEmptyFields={!state.email}
            loadingText="Sending..."
          >
            Send reset link
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
