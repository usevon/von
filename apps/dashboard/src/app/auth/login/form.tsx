"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Form, toast } from "@usevon/ui";

import { TextField, SubmitButton, validators } from "@/components/form";
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
          showError(data.error.message || "Invalid credentials");
          return;
        }

        showSuccess("Welcome back!");
        router.push(props.redirectTo || "/");
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
        name="email"
        validators={{ onChange: validators.compose(validators.required("Email is required"), validators.email()) }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            disabled={form.state.isSubmitting}
          />
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{ onChange: validators.required("Password is required") }}
      >
        {(field) => (
          <TextField
            field={field}
            label="Password"
            labelExtra={
              <Link
                className="text-muted-foreground text-xs hover:text-foreground"
                href={{
                  pathname: "/auth/forgot-password",
                  query: props.redirectTo && props.redirectTo !== "/" ? { redirect: props.redirectTo } : undefined,
                }}
              >
                Forgot password?
              </Link>
            }
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            disabled={form.state.isSubmitting}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        email: state.values.email,
        password: state.values.password,
      })}>
        {(state) => (
          <SubmitButton
            className="w-full"
            canSubmit={state.canSubmit}
            isSubmitting={state.isSubmitting}
            hasEmptyFields={!state.email || !state.password}
            loadingText="Signing in..."
          >
            Sign in
          </SubmitButton>
        )}
      </form.Subscribe>
    </Form>
  );
};
