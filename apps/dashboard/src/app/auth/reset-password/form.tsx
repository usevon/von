"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Form, toast } from "@usevon/ui";

import { TextField, SubmitButton, validators } from "@/components/form";
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
        validators={{ onChange: validators.compose(validators.required("Password is required"), validators.minLength(8, "Password must be at least 8 characters")) }}
      >
        {(field) => (
          <TextField
            field={field}
            label="New password"
            description="Must be at least 8 characters"
            placeholder="••••••••"
            type="password"
            autoComplete="new-password"
            disabled={form.state.isSubmitting}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        password: state.values.password,
      })}>
        {(state) => (
          <SubmitButton
            className="w-full"
            canSubmit={state.canSubmit}
            isSubmitting={state.isSubmitting}
            hasEmptyFields={!state.password}
            loadingText="Resetting..."
          >
            Reset password
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
