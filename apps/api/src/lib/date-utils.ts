import { BadRequestError } from "@usevon/utils";

/**
 * Parses an optional ISO date string, throwing a BadRequestError on invalid format.
 */
export const parseOptionalDate = (
  value: string | undefined,
  fieldName: "from" | "to"
): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid ${fieldName} date`);
  }

  return date;
};

/**
 * Validates that `from` is not after `to`, if both are provided.
 */
export const validateDateRange = (from: Date | null, to: Date | null): void => {
  if (from && to && from > to) {
    throw new BadRequestError("from must be before or equal to to");
  }
};
