"use client";

import { useForm } from "@tanstack/react-form";
import { Button, Form, Separator, Spinner, toast } from "@usevon/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth";
import { SubmitButton, TextField, validators } from "@/components/form";
import { authClient, signUp } from "@/lib/auth/client";

const COOLDOWN_SECONDS = 60;

type SignupFormProps = {
  redirectTo?: string;
};

export const SignupForm = (props: SignupFormProps) => {
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) { return; }
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!verifyEmail) { return; }
    setIsResending(true);
    try {
      await authClient.sendVerificationEmail({
        email: verifyEmail,
        callbackURL: window.location.origin,
      });
      setCooldown(COOLDOWN_SECONDS);
      toast.success("Email sent", "Check your inbox for the verification link");
    } catch {
      toast.error("Failed to resend", "Please try again later");
    } finally {
      setIsResending(false);
    }
  }, [verifyEmail]);

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
        setCooldown(COOLDOWN_SECONDS);
      } catch {
        toast.error("Something went wrong", "Please try again later");
      }
    },
  });

  if (verifyEmail) {
    const isDisabled = isResending || cooldown > 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground text-sm">
            We sent a verification link to{" "}
            <strong className="text-foreground">{verifyEmail}</strong>
          </p>
        </div>
        <Button
          className="w-full"
          disabled={isDisabled}
          onClick={handleResend}
          variant="outline"
        >
          {(() => {
            if (isResending) {
              return (
                <>
                  <Spinner className="size-4" />
                  Sending...
                </>
              );
            }
            if (cooldown > 0) {
              return `Resend in ${cooldown}s`;
            }
            return "Resend verification email";
          })()}
        </Button>
        <p className="text-muted-foreground text-sm">
          Already verified?{" "}
          <Link className="text-foreground underline" href="/auth/login">
            Sign in
          </Link>
        </p>
      </div>
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
