type DateToString<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};

export const toISODates = <T extends Record<string, unknown>>(
  row: T
): DateToString<T> => {
  const result = { ...row } as Record<string, unknown>;
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    }
  }
  return result as DateToString<T>;
};

export type TransformMappings = {
  rename?: Record<string, string>;
  remove?: string[];
  defaults?: Record<string, unknown>;
};

export type Transforms = Record<string, TransformMappings>;

export function applyTransforms(
  payload: Record<string, unknown>,
  transforms: TransformMappings
): Record<string, unknown> {
  const result = { ...payload };

  if (transforms.remove) {
    for (const field of transforms.remove) {
      delete result[field];
    }
  }

  if (transforms.rename) {
    for (const [from, to] of Object.entries(transforms.rename)) {
      if (from in result) {
        result[to] = result[from];
        delete result[from];
      }
    }
  }

  if (transforms.defaults) {
    for (const [field, value] of Object.entries(transforms.defaults)) {
      if (!(field in result)) {
        result[field] = value;
      }
    }
  }

  return result;
}
