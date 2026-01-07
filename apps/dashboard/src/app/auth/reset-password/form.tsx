"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Button, Field, FieldLabel, FieldMessage, FieldDescription, Form, Input, toast } from "@usevon/ui";

import { authClient } from "@/lib/auth/client";

type ResetPasswordFormProps = {
  token: string;
};

export const ResetPasswordForm = (props: ResetPasswordFormProps) => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!props.token) {
          toast.error("Invalid or expired reset link");
          return;
        }

        const { data, showSuccess, showError } = await toast.timed(
          () => authClient.resetPassword({ newPassword: value.password, token: props.token }),
          { loading: "Resetting password..." }
        );

        if (data.error) {
          showError(data.error.message || "Invalid or expired reset link");
          return;
        }

        showSuccess("Password reset successfully!");
        router.push("/auth/login");
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
        name="password"
        validators={{
          onChange: ({ value }) => {
            if (!value) return "Password is required";
            if (value.length < 8) return "Password must be at least 8 characters";
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>New password</FieldLabel>
            <Input
              autoComplete="new-password"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="••••••••"
              type="password"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            ) : (
              <FieldDescription>Must be at least 8 characters</FieldDescription>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        password: state.values.password,
      })}>
        {(state) => (
          <Button
            className="w-full"
            disabled={!state.canSubmit || !state.password || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? "Resetting..." : "Reset password"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
