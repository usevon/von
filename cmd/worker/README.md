# Von - Worker Server

<p align="center">
  <a href="../../LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
</p>

Worker server for processing and delivering webhooks from RabbitMQ queue.

## Running

```bash
go run main.go
```

Connects to RabbitMQ and processes webhook delivery jobs.

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
