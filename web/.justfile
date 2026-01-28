mod i18n '.just/i18n'
import '.just/api.just'

default:
	@just --list

fmt:
	pnpm exec prettier --write \
	--experimental-cli .

fmt-check:
	pnpm exec prettier --check \
	--experimental-cli .

eslint +FLAGS="":
	pnpm exec eslint --cache {{FLAGS}}

esfix: (eslint "--fix")

oxlint +FLAGS="":
	pnpm exec oxlint {{FLAGS}}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix

quickfix: oxfix

test:
	pnpm exec vitest

check:
  pnpm tsgo -p .
