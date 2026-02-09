import { Button } from "@usevon/ui";

type SubmitButtonProps = {
  canSubmit: boolean;
  isSubmitting: boolean;
  hasEmptyFields?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
};

export const SubmitButton = (props: SubmitButtonProps) => {
  const {
    canSubmit,
    isSubmitting,
    hasEmptyFields = false,
    children,
    loadingText,
    className,
  } = props;

  return (
    <Button
      className={className}
      disabled={!canSubmit || hasEmptyFields || isSubmitting}
      type="submit"
    >
      {isSubmitting ? (loadingText ?? children) : children}
    </Button>
  );
};
