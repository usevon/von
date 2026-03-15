"use client";

import { useForm } from "@tanstack/react-form";

import { Form, toast } from "@usevon/ui";

import { SubmitButton, TextField, validators } from "@/components/form";
import { authClient } from "@/lib/auth/client";

export const ForgotPasswordForm = () => {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, showSuccess, showError } = await toast.timed(
          () =>
            authClient.requestPasswordReset({
              email: value.email,
              redirectTo: `${window.location.origin}/auth/reset-password`,
            }),
          { loading: "Sending reset link..." }
        );

        if (data.error) {
          showError("Request failed", data.error.message);
          return;
        }

        showSuccess(
          "Check your email",
          "If an account exists, you'll receive a reset link"
        );
      } catch {
        toast.error("Something went wrong", "Please try again later");
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
        validators={{
          onChange: validators.compose(
            validators.required("Email is required"),
            validators.email()
          ),
        }}
      >
        {(field) => (
          <TextField
            autoComplete="email"
            disabled={form.state.isSubmitting}
            field={field}
            label="Email"
            placeholder="Email"
            type="email"
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          email: state.values.email,
        })}
      >
        {(state) => (
          <SubmitButton
            canSubmit={state.canSubmit}
            className="w-full"
            hasEmptyFields={!state.email}
            isSubmitting={state.isSubmitting}
            loadingText="Sending..."
          >
            Send reset link
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
