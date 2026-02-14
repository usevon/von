import { InternalServerError } from "@usevon/utils";

export const dispatchWithFailureHandler = async <T>(
  enqueue: () => Promise<T>,
  onFailure: () => Promise<void>
): Promise<T> => {
  try {
    return await enqueue();
  } catch {
    await onFailure();
    throw new InternalServerError();
  }
};
