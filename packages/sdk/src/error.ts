export class VonError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'VonError'
    this.code = code ?? 'UNKNOWN_ERROR'
    this.statusCode = statusCode ?? 500
  }

  static fromResponse(data: { error?: string; code?: string }, statusCode: number): VonError {
    return new VonError(data.error ?? 'Unknown error', data.code, statusCode)
  }
}
