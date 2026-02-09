const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidatorFn = (props: { value: string }) => string | undefined;

export const required =
  (msg?: string): ValidatorFn =>
  ({ value }) =>
    value.trim() ? undefined : (msg ?? "This field is required");

export const minLength =
  (min: number, msg?: string): ValidatorFn =>
  ({ value }) =>
    value.trim().length >= min
      ? undefined
      : (msg ?? `Must be at least ${min} characters`);

export const email =
  (msg?: string): ValidatorFn =>
  ({ value }) => {
    if (!value) {
      return;
    }
    return EMAIL_REGEX.test(value)
      ? undefined
      : (msg ?? "Please enter a valid email address");
  };

export const compose =
  (...validators: ValidatorFn[]): ValidatorFn =>
  (props) => {
    for (const validator of validators) {
      const error = validator(props);
      if (error) {
        return error;
      }
    }
    return;
  };
