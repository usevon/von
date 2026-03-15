/**
 * Races a promise against a timeout. Rejects with an Error if the timeout
 * elapses before the promise settles.
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
