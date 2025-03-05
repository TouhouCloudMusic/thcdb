fmt:
	npx prettier --write .

eslint +FLAGS="":
	npx eslint --cache {{FLAGS}}

esfix: (eslint "--fix")

oxlint +FLAGS="":
	bunx oxlint -c oxlintrc.json --import-plugin --disable-react-plugin --jsx-a11y-plugin --promise-plugin {{FLAGS}}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix
