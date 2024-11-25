set windows-shell := ["pwsh.exe", "-NoLogo","-Command"]

fmt:
  taplo fmt
  cargo fmt

fix: fmt
  cargo clippy --fix --allow-dirty --allow-staged

pre-push:
  taplo check
  cargo fmt --check
  cargo clippy

default: fix
