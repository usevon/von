# Von - Go SDK

<p align="center">
  <a href="../../LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
</p>

Go client library for interacting with Von's webhooks infrastructure.

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
