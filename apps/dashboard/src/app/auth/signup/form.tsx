"use client";

import { useForm } from "@tanstack/react-form";
import { Form, Separator, toast } from "@usevon/ui";
import Link from "next/link";
import { useState } from "react";
import { EmailVerification } from "@/components/auth/email-verification";
import { OAuthButtons } from "@/components/auth/oauth";
import { SubmitButton, TextField, validators } from "@/components/form";
import { signUp } from "@/lib/auth/client";

type SignupFormProps = {
  redirectTo?: string;
};

export const SignupForm = (props: SignupFormProps) => {
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

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
              callbackURL: window.location.origin,
            }),
          { loading: "Creating account..." }
        );

        if (data.error) {
          const message = data.error.message?.includes("already exists")
            ? "An account with this email already exists"
            : data.error.message;
          showError("Account creation failed", message);
          return;
        }

        showSuccess(
          "Account created",
          "Check your email for a verification link"
        );
        setVerifyEmail(value.email);
      } catch {
        toast.error("Something went wrong", "Please try again later");
      }
    },
  });

  if (verifyEmail) {
    return (
      <EmailVerification
        description="We sent a verification link to"
        email={verifyEmail}
        footer={
          <p className="text-muted-foreground text-sm">
            Already verified?{" "}
            <Link className="text-foreground underline" href="/auth/login">
              Sign in
            </Link>
          </p>
        }
        title="Check your email"
      />
    );
  }

  const redirectTo = props.redirectTo ?? "/";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          Create an account
        </h1>
        <p className="text-muted-foreground text-sm">Get started with Von</p>
      </div>
      <OAuthButtons mode="signup" redirectTo={redirectTo} />
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>
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
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link
          className="text-foreground underline"
          href={{
            pathname: "/auth/login",
            query: redirectTo !== "/" ? { redirect: redirectTo } : undefined,
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
