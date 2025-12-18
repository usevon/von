import { InternalServerError } from "@usevon/utils";
import { log } from "@/lib/logger";

export const withServiceError = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    log.error({ error }, `Error ${context}`);
    throw new InternalServerError(`Failed to ${context}`);
  }
};
