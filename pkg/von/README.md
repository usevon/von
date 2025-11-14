# Von Go SDK

Go SDK for sending webhooks via Von.

## Installation

```bash
go get github.com/usevon/von/pkg/von
```

## Usage

```go
package main

import (
    "log"
    "github.com/usevon/von/pkg/von"
    "github.com/usevon/von/pkg/types"
)

func main() {
    client := von.NewClient("http://localhost:3000", "your-api-key")

    result, err := client.Send(types.SendWebhookRequest{
        To:    "https://customer.com/webhook",
        Event: "order.created",
        Data: map[string]interface{}{
            "orderId": "123",
            "amount":  99.99,
        },
    })

    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Webhook sent: %+v", result)
}
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
