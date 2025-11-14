type SendWebhookOptions = {
  to: string;
  event: string;
  data: Record<string, any>;
  headers?: Record<string, string>;
};

type WebhookResult = {
  success: boolean;
  statusCode: number;
  latency: number;
  attempts: number;
  error?: string;
};

class VonSDK {
  private apiUrl: string;
  private apiKey?: string;

  constructor(config?: { apiUrl?: string; apiKey?: string }) {
    this.apiUrl = config?.apiUrl || 'http://localhost:3000';
    this.apiKey = config?.apiKey;
  }

  async send(options: SendWebhookOptions): Promise<WebhookResult> {
    const response = await fetch(`${this.apiUrl}/api/webhooks/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Failed to send webhook: ${response.statusText}`);
    }

    return response.json();
  }
}

export const von = new VonSDK();
export { VonSDK };
export type { SendWebhookOptions, WebhookResult };
