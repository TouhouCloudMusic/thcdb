mod i18n '.just/i18n'

import '.just/api.just'

set positional-arguments

default:
    @just --list

fmt:
    pnpm exec prettier --write \
    --experimental-cli .
    just --fmt

fmt-check:
    pnpm exec prettier --check \
    --experimental-cli .
    just --fmt --check

eslint +FLAGS="":
    pnpm exec eslint --cache {{ FLAGS }}

esfix: (eslint "--fix")

oxlint +FLAGS="":
    pnpm exec oxlint --type-aware --type-check --report-unused-disable-directives {{ FLAGS }}

oxfix: (oxlint "--fix")

lint: oxlint eslint

fix: oxfix esfix

quickfix: oxfix

test:
    pnpm exec vitest

check *files:
    pnpm exec oxlint --type-aware --type-check --report-unused-disable-directives "$@"
