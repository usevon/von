"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Button, Field, FieldLabel, FieldMessage, Form, Input, toast } from "@usevon/ui";

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
        validators={{
          onChange: ({ value }) => {
            if (!value) return "Email is required";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return "Please enter a valid email address";
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>Email</FieldLabel>
            <Input
              autoComplete="email"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Email"
              type="email"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            )}
          </Field>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) => {
            if (!value) return "Password is required";
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <div className="flex w-full items-center justify-between">
              <FieldLabel>Password</FieldLabel>
              <Link
                className="text-muted-foreground text-xs hover:text-foreground"
                href={{
                  pathname: "/auth/forgot-password",
                  query: props.redirectTo && props.redirectTo !== "/" ? { redirect: props.redirectTo } : undefined,
                }}
              >
                Forgot password?
              </Link>
            </div>
            <Input
              autoComplete="current-password"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="••••••••"
              type="password"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        email: state.values.email,
        password: state.values.password,
      })}>
        {(state) => (
          <Button
            className="w-full"
            disabled={!state.canSubmit || !state.email || !state.password || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
