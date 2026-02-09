import type { AnyFieldApi } from "@tanstack/react-form";

import { Input } from "@usevon/ui";

import { FormField } from "./form-field";

type TextFieldProps = {
  field: AnyFieldApi;
  label: string;
  labelExtra?: React.ReactNode;
  description?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  type?: "text" | "email" | "password";
};

export const TextField = (props: TextFieldProps) => {
  const {
    field,
    label,
    labelExtra,
    description,
    placeholder,
    autoComplete,
    autoFocus,
    disabled,
    type = "text",
  } = props;

  return (
    <FormField
      description={description}
      field={field}
      label={label}
      labelExtra={labelExtra}
    >
      <Input
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={field.state.value as string}
      />
    </FormField>
  );
};
