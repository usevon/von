package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "dev":
		fmt.Println("Starting dev tunnel...")
		// TODO: Implement dev tunnel
	case "send":
		fmt.Println("Sending webhook...")
		// TODO: Implement send command
	case "logs":
		fmt.Println("Fetching logs...")
		// TODO: Implement logs command
	case "validate":
		fmt.Println("Validating webhook URL...")
		// TODO: Implement validate command
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Von CLI - Webhooks infrastructure")
	fmt.Println("\nUsage:")
	fmt.Println("  von dev --port <port>       Start dev tunnel")
	fmt.Println("  von send [options]          Send test webhook")
	fmt.Println("  von logs                    View webhook logs")
	fmt.Println("  von validate <url>          Validate webhook URL")
}
