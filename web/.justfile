mod i18n '.just/i18n'

default:
	@just --list

fmt:
	pnpm exec prettier --write .

eslint +FLAGS="":
	pnpm exec eslint --cache {{FLAGS}}

esfix: (eslint "--fix")

oxlint +FLAGS="":
	pnpm exec oxlint -c .oxlintrc.json {{FLAGS}}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix

quickfix: oxfix

test:
	pnpm exec vitest
