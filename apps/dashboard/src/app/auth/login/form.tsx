"use client";

import { useForm } from "@tanstack/react-form";
import { Form, Separator, toast } from "@usevon/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailVerification } from "@/components/auth/email-verification";
import { OAuthButtons } from "@/components/auth/oauth";
import { SubmitButton, TextField, validators } from "@/components/form";
import { signIn } from "@/lib/auth/client";

type LoginFormProps = {
  redirectTo?: string;
};

export const LoginForm = (props: LoginFormProps) => {
  const router = useRouter();
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, showSuccess, showError } = await toast.timed(
          () =>
            signIn.email({
              email: value.email,
              password: value.password,
              callbackURL: window.location.origin,
            }),
          { loading: "Signing in..." }
        );

        if (data.error) {
          if (data.error.code === "EMAIL_NOT_VERIFIED") {
            showError(
              "Email not verified",
              "Check your inbox for a verification link"
            );
            setVerifyEmail(value.email);
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

  if (verifyEmail) {
    return (
      <EmailVerification
        backLabel="Back to sign in"
        description="Check your inbox for a verification link sent to"
        email={verifyEmail}
        onBack={() => setVerifyEmail(null)}
        title="Email not verified"
      />
    );
  }

  const redirectTo = props.redirectTo ?? "/";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      <OAuthButtons mode="login" redirectTo={redirectTo} />
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
            onChange: validators.required("Password is required"),
          }}
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
                      redirectTo !== "/" ? { redirect: redirectTo } : undefined,
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
      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link
          className="text-foreground underline"
          href={{
            pathname: "/auth/signup",
            query: redirectTo !== "/" ? { redirect: redirectTo } : undefined,
          }}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
};
