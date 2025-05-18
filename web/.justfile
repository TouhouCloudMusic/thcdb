mod i18n '.just/i18n'

default:
	@just --list

fmt:
	npx prettier --write .

eslint +FLAGS="":
	npx eslint --cache {{FLAGS}}

esfix: (eslint "--fix")

oxlint +FLAGS="":
	bunx oxlint -c .oxlintrc.json {{FLAGS}}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix

quickfix: oxfix
