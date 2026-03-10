mod i18n '.just/i18n'

import '.just/api.just'

default:
    @just --list

fmt:
    pnpm exec prettier --write \
    --experimental-cli .
    just --fmt --unstable

fmt-check:
    pnpm exec prettier --check \
    --experimental-cli .
    just --fmt --unstable --check

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

check +FILES="":
    pnpm exec oxlint --type-aware --type-check --report-unused-disable-directives {{ FILES }}
