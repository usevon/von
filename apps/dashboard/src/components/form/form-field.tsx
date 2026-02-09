import type { AnyFieldApi } from "@tanstack/react-form";

import { Field, FieldDescription, FieldLabel, FieldMessage } from "@usevon/ui";

type FormFieldProps = {
  field: AnyFieldApi;
  label: string;
  labelExtra?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
};

export const FormField = (props: FormFieldProps) => {
  const { field, label, labelExtra, description, children } = props;
  const { meta, value } = field.state;
  const hasValue = typeof value === "string" ? !!value.trim() : !!value;
  const showError = meta.isTouched && hasValue && meta.errors.length > 0;

  return (
    <Field invalid={showError}>
      {labelExtra ? (
        <div className="flex w-full items-center justify-between">
          <FieldLabel>{label}</FieldLabel>
          {labelExtra}
        </div>
      ) : (
        <FieldLabel>{label}</FieldLabel>
      )}
      {children}
      {showError ? (
        <FieldMessage>{meta.errors[0]}</FieldMessage>
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
};
