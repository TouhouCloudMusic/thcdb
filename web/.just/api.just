set shell := ["bash", "-lc"]

SERVER_URL := env("VITE_SERVER_URL", "")
API_SCHEMA := if env("API_SCHEMA", "") != ""{
	env("API_SCHEMA", "")
} else if SERVER_URL != "" {
	SERVER_URL + "/openapi.json"
} else {
	""
}

gen-api schema=API_SCHEMA:
	@./scripts/gen-api.sh {{schema}}
