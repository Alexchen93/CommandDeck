package security

type Policy struct {
	RequireAuthorizedAssets bool
	DenyRawShell            bool
	HighRiskConfirmation    bool
}
