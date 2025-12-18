mod i18n '.just/i18n'

default:
	@just --list

fmt:
	pnpm dlx prettier --write \
	--experimental-cli \
	"src/**/*.{ts,tsx}" \
	"packages/**/*.{md,json,ts,tsx}" \
	"./{.storybook,.vscode,config,doc,plugins}/**/*" \
	".github/**/*.yml" \
	"*.{md,json,js,ts,html}"

eslint +FLAGS="":
	pnpm dlx eslint --cache {{FLAGS}}

esfix: (eslint "--fix")

oxlint +FLAGS="":
	pnpm dlx oxlint -c .oxlintrc.json {{FLAGS}}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix

quickfix: oxfix

test:
	pnpm dlx vitest

check:
  pnpm tsgo -p .
