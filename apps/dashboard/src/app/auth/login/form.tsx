"use client";

import { useForm } from "@tanstack/react-form";
import { Form, toast } from "@usevon/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SubmitButton, TextField, validators } from "@/components/form";
import { signIn } from "@/lib/auth/client";

type LoginFormProps = {
  redirectTo?: string;
};

export const LoginForm = (props: LoginFormProps) => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, showSuccess, showError } = await toast.timed(
          () => signIn.email({ email: value.email, password: value.password }),
          { loading: "Signing in..." }
        );

        if (data.error) {
          if (data.error.code === "EMAIL_NOT_VERIFIED") {
            showError(
              "Email not verified",
              "Check your inbox for a verification link"
            );
            router.push(
              `/auth/verify-email?email=${encodeURIComponent(value.email)}`
            );
            return;
          }
          showError("Sign in failed", data.error.message);
          return;
        }

        showSuccess("Welcome back");
        router.push(props.redirectTo || "/");
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

      <form.Field
        name="password"
        validators={{ onChange: validators.required("Password is required") }}
      >
        {(field) => (
          <TextField
            autoComplete="current-password"
            disabled={form.state.isSubmitting}
            field={field}
            label="Password"
            labelExtra={
              <Link
                className="text-muted-foreground text-xs hover:text-foreground"
                href={{
                  pathname: "/auth/forgot-password",
                  query:
                    props.redirectTo && props.redirectTo !== "/"
                      ? { redirect: props.redirectTo }
                      : undefined,
                }}
              >
                Forgot password?
              </Link>
            }
            placeholder="••••••••"
            type="password"
          />
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          email: state.values.email,
          password: state.values.password,
        })}
      >
        {(state) => (
          <SubmitButton
            canSubmit={state.canSubmit}
            className="w-full"
            hasEmptyFields={!(state.email && state.password)}
            isSubmitting={state.isSubmitting}
            loadingText="Signing in..."
          >
            Sign in
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
