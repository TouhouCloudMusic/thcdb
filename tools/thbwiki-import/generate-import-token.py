#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "python-dotenv>=1.0,<2",
# ]
# ///

from __future__ import annotations

import argparse
import secrets
import sys
from pathlib import Path

from dotenv import dotenv_values, set_key

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_ENV = (SCRIPT_DIR / "../../.env").resolve()
ENV_KEY = "IMPORT_BYPASS_TOKEN"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate an import rate-limit bypass token into .env.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV,
        help=f"Env file to update (default: {DEFAULT_ENV})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=f"Replace an existing {ENV_KEY} value.",
    )
    return parser.parse_args()


def generate_token() -> str:
    return secrets.token_urlsafe(48)


def main() -> int:
    args = parse_args()
    env_file = args.env_file.resolve()
    if not env_file.exists():
        print(f"warning: {env_file} does not exist; creating it", file=sys.stderr)
        env_file.touch()

    env = dotenv_values(env_file)
    replaced = ENV_KEY in env
    if replaced and not args.force:
        raise RuntimeError(f"{ENV_KEY} already exists. Use --force to replace it.")

    token = generate_token()
    set_key(env_file, ENV_KEY, token, quote_mode="never")

    action = "replaced" if replaced else "created"
    print(f"{action} {ENV_KEY} in {env_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
