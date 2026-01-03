"use client";

import { useForm } from "react-hook-form";
import { Button, Field, FieldLabel, FieldError, Input, Textarea } from "@usevon/ui";

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  message: string;
};

export const ContactForm = () => {
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-12 space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel>First name</FieldLabel>
          <Input
            {...register("firstName", { required: "First name is required" })}
            aria-invalid={errors.firstName ? "true" : undefined}
          />
          {errors.firstName && <FieldError>{errors.firstName.message}</FieldError>}
        </Field>

        <Field>
          <FieldLabel>Last name</FieldLabel>
          <Input
            {...register("lastName", { required: "Last name is required" })}
            aria-invalid={errors.lastName ? "true" : undefined}
          />
          {errors.lastName && <FieldError>{errors.lastName.message}</FieldError>}
        </Field>
      </div>

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
        <FieldLabel>Company</FieldLabel>
        <Input
          {...register("company")}
          aria-invalid={errors.company ? "true" : undefined}
        />
      </Field>

      <Field>
        <FieldLabel>Message</FieldLabel>
        <Textarea
          {...register("message", { required: "Message is required" })}
          aria-invalid={errors.message ? "true" : undefined}
        />
        {errors.message && <FieldError>{errors.message.message}</FieldError>}
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
};
