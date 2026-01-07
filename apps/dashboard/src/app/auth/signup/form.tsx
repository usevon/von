"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";

import { Button, Field, FieldLabel, FieldMessage, FieldDescription, Form, Input, toast } from "@usevon/ui";

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
          () => signUp.email({ name: value.name, email: value.email, password: value.password }),
          { loading: "Creating account..." }
        );

        if (data.error) {
          showError(data.error.message || "Failed to create account");
          return;
        }

        showSuccess("Account created!");
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
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value) return "Name is required";
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>Name</FieldLabel>
            <Input
              autoComplete="name"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Name"
              type="text"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            )}
          </Field>
        )}
      </form.Field>

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
            if (value.length < 8) return "Password must be at least 8 characters";
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field invalid={field.state.meta.errors.length > 0}>
            <FieldLabel>Password</FieldLabel>
            <Input
              autoComplete="new-password"
              disabled={form.state.isSubmitting}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="••••••••"
              type="password"
              value={field.state.value}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
              <FieldMessage>{field.state.meta.errors[0]}</FieldMessage>
            ) : (
              <FieldDescription>Must be at least 8 characters</FieldDescription>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
        name: state.values.name,
        email: state.values.email,
        password: state.values.password,
      })}>
        {(state) => (
          <Button
            className="w-full"
            disabled={!state.canSubmit || !state.name || !state.email || !state.password || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
};
