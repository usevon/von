"use client";

import { useForm } from "@tanstack/react-form";

import { Button, Field, FieldLabel, FieldMessage, Form, Input, toast } from "@usevon/ui";

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
        validators={{
          onChange: ({ value }) => {
            if (!value) return "Email is required";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return "Please enter a valid email address";
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>Email</FieldLabel>
            <Input
              autoComplete="email"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Email"
              type="email"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        email: state.values.email,
      })}>
        {(state) => (
          <Button
            className="w-full"
            disabled={!state.canSubmit || !state.email || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
