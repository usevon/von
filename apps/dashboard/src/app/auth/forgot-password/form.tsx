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
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: "/auth/reset-password",
      });

      if (error) {
        toast.error(error.message || "Failed to send reset link");
        return;
      }

      toast.success("If an account exists, you'll receive a reset link");
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
          onBlur: ({ value }) => {
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

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            className="w-full"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
