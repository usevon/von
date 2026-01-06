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
      if (!props.token) {
        toast.error("Invalid or expired reset link");
        return;
      }

      const { error } = await authClient.resetPassword({
        newPassword: value.password,
        token: props.token,
      });

      if (error) {
        toast.error(error.message || "Invalid or expired reset link");
        return;
      }

      toast.success("Password reset successfully!");
      router.push("/auth/login");
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
          onBlur: ({ value }) => {
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

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            className="w-full"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
