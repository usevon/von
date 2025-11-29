import { VonError } from '@/error'
import type { VonConfig } from '@/types'
import { webhooksMethods } from '@/webhooks'
import { endpointsMethods } from '@/endpoints'
import { inboundMethods } from '@/inbound'

const DEFAULT_BASE_URL = 'http://localhost:3000'

export class Von {
  private readonly baseUrl: string
  private readonly apiKey?: string

  public readonly webhooks: ReturnType<typeof webhooksMethods>
  public readonly endpoints: ReturnType<typeof endpointsMethods>
  public readonly inbound: ReturnType<typeof inboundMethods>

  constructor(config?: VonConfig) {
    this.baseUrl = config?.baseUrl ?? process.env.VON_BASE_URL ?? DEFAULT_BASE_URL
    this.apiKey = config?.apiKey ?? process.env.VON_API_KEY

    this.webhooks = webhooksMethods(this)
    this.endpoints = endpointsMethods(this)
    this.inbound = inboundMethods(this)
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      throw VonError.fromResponse(data, response.status)
    }

    return data as T
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}
