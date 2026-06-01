package toolkits

type Toolkit struct {
	ID          string   `json:"id" yaml:"id"`
	Name        string   `json:"name" yaml:"name"`
	Version     string   `json:"version" yaml:"version"`
	Description string   `json:"description" yaml:"description"`
	Permissions []string `json:"permissions" yaml:"permissions"`
	Actions     []Action `json:"actions" yaml:"actions"`
}

type Action struct {
	ID          string            `json:"id" yaml:"id"`
	Name        string            `json:"name" yaml:"name"`
	Risk        string            `json:"risk" yaml:"risk"`
	Executor    string            `json:"executor" yaml:"executor"`
	ParamsSchema map[string]any   `json:"paramsSchema" yaml:"paramsSchema"`
	Command     Command           `json:"command" yaml:"command"`
	Parser      map[string]string `json:"parser" yaml:"parser"`
	Renderer    map[string]string `json:"renderer" yaml:"renderer"`
}

type Command struct {
	Argv           []string `json:"argv" yaml:"argv"`
	Shell          bool     `json:"shell" yaml:"shell"`
	TimeoutSeconds int      `json:"timeoutSeconds" yaml:"timeoutSeconds"`
}
