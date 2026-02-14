type StatusFn = (code: number, body: { error: string }) => unknown;

export const orNotFound = <T>(
  value: T | null | undefined,
  status: StatusFn,
  message: string
): T | unknown => value ?? status(404, { error: message });
