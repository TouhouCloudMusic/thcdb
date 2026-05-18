from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Callable

IMPORT_TOKEN_HEADER = "X-Import-Token"


@dataclass(frozen=True, slots=True)
class ImportRateLimitConfig:
    token: str
    headers: dict[str, str] | None
    limiter: Any | None
    req_per_sec_label: str

    @property
    def enabled(self) -> bool:
        return bool(self.token)

    @property
    def enabled_label(self) -> str:
        return "on" if self.enabled else "off"


def resolve_import_token(
    explicit_token: str | None,
    env_from_file: dict[str, str],
) -> str:
    return (
        explicit_token
        or os.getenv("IMPORT_BYPASS_TOKEN")
        or env_from_file.get("IMPORT_BYPASS_TOKEN")
        or ""
    )


def build_import_rate_limit_config(
    explicit_token: str | None,
    env_from_file: dict[str, str],
    req_per_sec: float,
    req_per_sec_explicit: bool,
    limiter_factory: Callable[[float], Any],
) -> ImportRateLimitConfig:
    token = resolve_import_token(explicit_token, env_from_file)
    bypass_server_limit = bool(token) and not req_per_sec_explicit

    return ImportRateLimitConfig(
        token=token,
        headers={IMPORT_TOKEN_HEADER: token} if token else None,
        limiter=None if bypass_server_limit else limiter_factory(req_per_sec),
        req_per_sec_label="off" if bypass_server_limit else f"{req_per_sec:g}",
    )


def raise_import_rate_limit_token_error(endpoint: str) -> None:
    raise RuntimeError(
        "HTTP 429 while rate_limit_token=on "
        f"at {endpoint}. Check that server IMPORT_BYPASS_TOKEN is configured "
        "and matches the import script token."
    )
