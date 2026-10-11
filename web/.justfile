mod i18n '.just/i18n'

import '.just/api.just'

set positional-arguments

default:
    @just --list

fmt:
    pnpm exec oxfmt --write .
    just --fmt

fmt-check:
    pnpm exec oxfmt --check .
    just --fmt --check

oxlint +FLAGS="":
    pnpm exec oxlint --type-aware --type-check --report-unused-disable-directives {{ FLAGS }}

oxfix: (oxlint "--fix")

lint: oxlint

fix: oxfix

quickfix: oxfix

test:
    pnpm exec vitest

check *files:
    pnpm exec oxlint --type-aware --type-check --report-unused-disable-directives --no-error-on-unmatched-pattern "$@"
