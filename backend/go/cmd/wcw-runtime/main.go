package main

import (
	"encoding/json"
	"fmt"
	"os"

	"commanddeck/runtime/internal/actions"
	"commanddeck/runtime/internal/jobs"
	"commanddeck/runtime/internal/security"
)

func main() {
	registry := actions.NewRegistry()
	registry.Register(actions.Action{
		ID:       "nmap_tcp_scan",
		Name:     "Nmap TCP Scan",
		Risk:     actions.RiskMedium,
		Executor: actions.ExecutorContainer,
		Permissions: []string{
			"network.scan",
			"container.execute",
		},
	})

	policy := security.Policy{
		RequireAuthorizedAssets: true,
		DenyRawShell:            true,
	}

	runtime := jobs.NewRuntime(registry, policy)
	result := runtime.DryRun("nmap_tcp_scan")

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(result); err != nil {
		fmt.Fprintf(os.Stderr, "encode result: %v\n", err)
		os.Exit(1)
	}
}
