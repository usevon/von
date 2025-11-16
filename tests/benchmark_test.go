package tests

import (
	"bytes"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

// BenchmarkAll is a placeholder for running all benchmarks with go test ./... -bench=.
func BenchmarkAll(b *testing.B) {
	b.Skip("Use this to run all benchmarks: go test ./... -bench=.")
}

// TestRunAllBenchmarks runs all benchmark suites and formats output.
func TestRunAllBenchmarks(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping benchmark execution in short mode")
	}

	benchmarks := []struct {
		name string
		path string
	}{
		{"Queue Publishing", "./tests/queue/..."},
		{"Worker HTTP Client", "./tests/worker/..."},
		{"Circuit Breaker & Retry", "./internal/worker/..."},
	}

	var allOutput bytes.Buffer
	firstSection := true

	for _, bench := range benchmarks {
		t.Logf("Running %s benchmarks...", bench.name)

		start := time.Now()
		cmd := exec.Command("go", "test", bench.path, "-bench=.", "-run=^$")
		cmd.Dir = ".."

		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			t.Logf("Warning: %s benchmarks failed: %v", bench.name, err)
			if stderr.Len() > 0 {
				t.Logf("Error output: %s", stderr.String())
			}
			continue
		}

		elapsed := time.Since(start)
		t.Logf("Completed %s benchmarks in %.2fs", bench.name, elapsed.Seconds())

		output := stdout.String()

		// Add section header (only add opening dashes for first section)
		if firstSection {
			allOutput.WriteString(strings.Repeat("-", 75) + "\n")
			firstSection = false
		}
		allOutput.WriteString(formatLine(bench.name, "Iterations", "Latency (ns/op)"))
		allOutput.WriteString(strings.Repeat("-", 75) + "\n")

		// Extract and format benchmark lines
		lines := strings.Split(output, "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "Benchmark") {
				formatted := parseBenchmarkLine(line)
				if formatted != "" {
					allOutput.WriteString(formatted)
				}
			}
		}
		allOutput.WriteString(strings.Repeat("-", 75) + "\n")
	}

	// Remove trailing newline
	output := strings.TrimRight(allOutput.String(), "\n")
	t.Log("\n" + output)
}

// formatLine formats a benchmark result line with consistent column widths
func formatLine(name, iterations, latency string) string {
	return padRight(name, 42) + padLeft(iterations, 15) + padLeft(latency, 18) + "\n"
}

// parseBenchmarkLine parses a raw benchmark line and formats it
func parseBenchmarkLine(line string) string {
	// Example line: "BenchmarkPublisher-16              	   27526	     41180 ns/op"
	parts := strings.Fields(line)
	if len(parts) < 3 {
		return ""
	}

	// Strip "Benchmark" prefix from name
	name := parts[0]
	name = strings.TrimPrefix(name, "Benchmark")

	iterations := parts[1]
	latency := parts[2]

	// Remove "ns/op" suffix if present
	if len(parts) > 3 && parts[3] == "ns/op" {
		latency = parts[2]
	}

	return formatLine(name, iterations, latency)
}

// padRight pads a string to the right with spaces
func padRight(s string, width int) string {
	if len(s) >= width {
		return s
	}
	return s + strings.Repeat(" ", width-len(s))
}

// padLeft pads a string to the left with spaces
func padLeft(s string, width int) string {
	if len(s) >= width {
		return s
	}
	return strings.Repeat(" ", width-len(s)) + s
}

// TestBenchmarksSmokeTest verifies all benchmark files compile.
func TestBenchmarksSmokeTest(t *testing.T) {
	benchmarkPaths := []string{
		"./tests/queue",
		"./tests/worker",
		"./tests/api",
		"./tests/e2e",
		"./internal/worker",
	}

	for _, path := range benchmarkPaths {
		t.Run(path, func(t *testing.T) {
			cmd := exec.Command("go", "test", "-c", path, "-o", os.DevNull)
			cmd.Dir = ".."
			var stderr bytes.Buffer
			cmd.Stderr = &stderr

			if err := cmd.Run(); err != nil {
				t.Errorf("Benchmark compilation failed for %s: %v\n%s", path, err, stderr.String())
			}
		})
	}
}
