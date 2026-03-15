"use client";

import { useForm } from "@tanstack/react-form";
import { Form, toast } from "@usevon/ui";
import { useRouter } from "next/navigation";

import { SubmitButton, TextField, validators } from "@/components/form";
import { signUp } from "@/lib/auth/client";

type SignupFormProps = {
  redirectTo?: string;
};

export const SignupForm = (props: SignupFormProps) => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, showSuccess, showError } = await toast.timed(
          () =>
            signUp.email({
              name: value.name,
              email: value.email,
              password: value.password,
            }),
          { loading: "Creating account..." }
        );

        if (data.error) {
          showError("Account creation failed", data.error.message);
          return;
        }

        showSuccess(
          "Account created",
          "Check your email for a verification link"
        );
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(value.email)}`
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
        name="name"
        validators={{ onChange: validators.required("Name is required") }}
      >
        {(field) => (
          <TextField
            autoComplete="name"
            disabled={form.state.isSubmitting}
            field={field}
            label="Name"
            placeholder="Name"
          />
        )}
      </form.Field>

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
            label="Password"
            placeholder="••••••••"
            type="password"
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          name: state.values.name,
          email: state.values.email,
          password: state.values.password,
        })}
      >
        {(state) => (
          <SubmitButton
            canSubmit={state.canSubmit}
            className="w-full"
            hasEmptyFields={!(state.name && state.email && state.password)}
            isSubmitting={state.isSubmitting}
            loadingText="Creating account..."
          >
            Create account
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
