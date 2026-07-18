/** Minimal fetch transport for the Von API, no runtime dependencies. */

export type VonApiError = {
  status: number;
  /** The decoded response body, whatever shape the server sent. */
  value: unknown;
  message: string;
};

export type VonResult<T> =
  | { data: T; error: null; status: number; response: Response }
  | { data: null; error: VonApiError; status: number; response: Response };

export type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
};

const TRAILING_SLASHES = /\/+$/;

const joinUrl = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(TRAILING_SLASHES, "")}${path}`;

const buildQuery = (query?: Record<string, unknown>): string => {
  if (!query) {
    return "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }
    params.append(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

const decode = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const messageOf = (value: unknown, status: number): string => {
  if (typeof value === "string" && value) {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const field = (value as { error?: unknown; message?: unknown }).error;
    if (typeof field === "string") {
      return field;
    }
    if (typeof field === "object" && field !== null) {
      const nested = (field as { message?: unknown }).message;
      if (typeof nested === "string") {
        return nested;
      }
    }
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return `Request failed with status ${status}`;
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Transport failures reject so the caller's retry loop can tell them apart from an HTTP error response.
  async request<T>(options: RequestOptions): Promise<VonResult<T>> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await fetch(
      joinUrl(this.baseUrl, options.path) + buildQuery(options.query),
      {
        method: options.method,
        headers,
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
      }
    );

    const value = await decode(response);
    const status = response.status;

    if (response.ok) {
      return { data: value as T, error: null, status, response };
    }
    return {
      data: null,
      error: { status, value, message: messageOf(value, status) },
      status,
      response,
    };
  }
}
