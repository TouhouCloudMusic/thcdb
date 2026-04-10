set windows-shell := ["sh.exe","-c"]
set shell := ["bash", "-lc"]

gen-api schema="":
	@./scripts/gen-api.ts {{schema}}
