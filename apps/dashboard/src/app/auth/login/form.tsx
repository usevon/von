"use client";

import { useForm } from "@tanstack/react-form";
import { Form, toast } from "@usevon/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SubmitButton, TextField, validators } from "@/components/form";
import { authClient, signIn } from "@/lib/auth/client";

const COOLDOWN_SECONDS = 60;

type LoginFormProps = {
  redirectTo?: string;
};

export const LoginForm = (props: LoginFormProps) => {
  const router = useRouter();
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!verifyEmail) return;
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
            setCooldown(COOLDOWN_SECONDS);
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
    const isDisabled = isResending || cooldown > 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-sm">Email not verified</p>
          <p className="text-muted-foreground text-sm">
            Check your inbox for a verification link sent to{" "}
            <strong className="text-foreground">{verifyEmail}</strong>
          </p>
        </div>
        <Button
          className="w-full"
          disabled={isDisabled}
          onClick={handleResend}
          variant="outline"
        >
          {isResending ? (
            <>
              <Spinner className="size-4" />
              Sending...
            </>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            "Resend verification email"
          )}
        </Button>
        <Button
          className="w-full"
          onClick={() => setVerifyEmail(null)}
          variant="ghost"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

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
