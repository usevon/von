"use client";

import { useForm } from "@tanstack/react-form";
import { Form, toast } from "@usevon/ui";
import { useRouter } from "next/navigation";

import { SubmitButton, TextField, validators } from "@/components/form";
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
          toast.error(
            "Invalid link",
            "This reset link is invalid or has expired"
          );
          return;
        }

        const { data, showSuccess, showError } = await toast.timed(
          () =>
            authClient.resetPassword({
              newPassword: value.password,
              token: props.token,
            }),
          { loading: "Resetting password..." }
        );

        if (data.error) {
          showError("Password reset failed", data.error.message);
          return;
        }

        showSuccess(
          "Password updated",
          "You can now sign in with your new password"
        );
        router.push("/auth/login");
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
        name="password"
        validators={{
          onChange: validators.compose(
            validators.required("Password is required"),
            validators.minLength(8, "Password must be at least 8 characters")
          ),
        }}
      >
        {(field) => (
          <TextField
            autoComplete="new-password"
            description="Must be at least 8 characters"
            disabled={form.state.isSubmitting}
            field={field}
            label="New password"
            placeholder="••••••••"
            type="password"
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          password: state.values.password,
        })}
      >
        {(state) => (
          <SubmitButton
            canSubmit={state.canSubmit}
            className="w-full"
            hasEmptyFields={!state.password}
            isSubmitting={state.isSubmitting}
            loadingText="Resetting..."
          >
            Reset password
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
