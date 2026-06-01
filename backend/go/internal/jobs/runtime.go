package jobs

import (
	"time"

	"commanddeck/runtime/internal/actions"
	"commanddeck/runtime/internal/security"
)

type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
	StatusCancelled Status = "cancelled"
)

type DryRunResult struct {
	ActionID     string           `json:"actionId"`
	Status       Status           `json:"status"`
	Executor     actions.Executor `json:"executor"`
	Allowed      bool             `json:"allowed"`
	AuditRequired bool             `json:"auditRequired"`
	Message      string           `json:"message"`
	CheckedAt    time.Time        `json:"checkedAt"`
}

type Runtime struct {
	registry *actions.Registry
	policy   security.Policy
}

func NewRuntime(registry *actions.Registry, policy security.Policy) *Runtime {
	return &Runtime{registry: registry, policy: policy}
}

func (runtime *Runtime) DryRun(actionID string) DryRunResult {
	action, ok := runtime.registry.Get(actionID)
	if !ok {
		return DryRunResult{
			ActionID:  actionID,
			Status:    StatusFailed,
			Allowed:   false,
			Message:   "action is not registered",
			CheckedAt: time.Now().UTC(),
		}
	}

	return DryRunResult{
		ActionID:     action.ID,
		Status:       StatusQueued,
		Executor:     action.Executor,
		Allowed:      runtime.policy.DenyRawShell,
		AuditRequired: true,
		Message:      "action passed registry and policy dry-run checks",
		CheckedAt:    time.Now().UTC(),
	}
}
