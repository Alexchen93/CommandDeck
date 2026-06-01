package actions

type Risk string

const (
	RiskLow    Risk = "low"
	RiskMedium Risk = "medium"
	RiskHigh   Risk = "high"
)

type Executor string

const (
	ExecutorLocalSafe Executor = "local-safe"
	ExecutorContainer Executor = "container"
	ExecutorVM        Executor = "vm"
	ExecutorRemoteSSH Executor = "remote-ssh"
)

type Action struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Risk        Risk     `json:"risk"`
	Executor    Executor `json:"executor"`
	Permissions []string `json:"permissions"`
}

type Registry struct {
	actions map[string]Action
}

func NewRegistry() *Registry {
	return &Registry{actions: map[string]Action{}}
}

func (registry *Registry) Register(action Action) {
	registry.actions[action.ID] = action
}

func (registry *Registry) Get(id string) (Action, bool) {
	action, ok := registry.actions[id]
	return action, ok
}
