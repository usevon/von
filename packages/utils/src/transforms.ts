export const toISODates = <T extends { createdAt: Date; updatedAt?: Date }>(
  row: T
): Omit<T, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt?: string } => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  ...(row.updatedAt && { updatedAt: row.updatedAt.toISOString() }),
})

export type TransformMappings = {
  rename?: Record<string, string>
  remove?: string[]
  defaults?: Record<string, unknown>
}

export type Transforms = Record<string, TransformMappings>

export function applyTransforms(
  payload: Record<string, unknown>,
  transforms: TransformMappings
): Record<string, unknown> {
  const result = { ...payload }

  if (transforms.remove) {
    for (const field of transforms.remove) {
      delete result[field]
    }
  }

  if (transforms.rename) {
    for (const [from, to] of Object.entries(transforms.rename)) {
      if (from in result) {
        result[to] = result[from]
        delete result[from]
      }
    }
  }

  if (transforms.defaults) {
    for (const [field, value] of Object.entries(transforms.defaults)) {
      if (!(field in result)) {
        result[field] = value
      }
    }
  }

  return result
}
