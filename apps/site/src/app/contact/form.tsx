"use client";

import { useForm } from "react-hook-form";
import { Button, Field, FieldLabel, FieldError, Input, Textarea, cn } from "@usevon/ui";

type ContactFormData = {
  name: string;
  email: string;
  message: string;
};

type ContactFormProps = {
  className?: string;
};

export const ContactForm = (props: ContactFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    // TODO: Implement form submission
    console.log(data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", props.className)}>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          {...register("name", { required: "Name is required" })}
          aria-invalid={errors.name ? "true" : undefined}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          aria-invalid={errors.email ? "true" : undefined}
        />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Message</FieldLabel>
        <Textarea
          {...register("message", { required: "Message is required" })}
          aria-invalid={errors.message ? "true" : undefined}
          className="h-40"
        />
        {errors.message && <FieldError>{errors.message.message}</FieldError>}
      </Field>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
};
