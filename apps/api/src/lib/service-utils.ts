import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@usevon/utils";
import { log } from "@/lib/logger";

const isKnownError = (error: unknown): boolean =>
  error instanceof BadRequestError ||
  error instanceof NotFoundError ||
  error instanceof UnauthorizedError ||
  error instanceof InternalServerError;

export const withServiceError = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    log.error({ error }, `Error ${context}`);
    throw new InternalServerError(`Failed to ${context}`);
  }
};
