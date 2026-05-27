#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["bashlex==0.18"]
# ///

import json
import re
import sys

import bashlex
import bashlex.errors


def check_manual_cargo_integration_test(command: str) -> str | None:
    if re.search(r"\bcargo\b(?=.*--features\b)(?=.*\bintegration-test\b)", command):
        return (
            "Use `just integration-test` instead of running integration tests through "
            "`cargo test`; the just recipe creates and cleans the test environment."
        )

    return None


def is_protected_env_var(name: str) -> bool:
    return name == "RUSTC_WRAPPER" or name.startswith("CARGO_PROFILE")


def assignment_var(word: str) -> str | None:
    name, separator, _ = word.partition("=")
    if separator == "":
        return None
    return name


def is_protected_env_var_assignment(word: str) -> bool:
    name = assignment_var(word)
    if name is not None:
        return is_protected_env_var(name)

    return False


def env_command_modifies_protected_env_var(arguments: list[str]) -> bool:
    iterator = iter(arguments)
    expects_unset_name = False

    for argument in iterator:
        if expects_unset_name:
            expects_unset_name = False
            if is_protected_env_var(argument):
                return True
            continue

        if argument in {"-u", "--unset"}:
            expects_unset_name = True
            continue

        if argument in {"-C", "--chdir"}:
            next(iterator, None)
            continue

        if argument.startswith("--unset=") and is_protected_env_var(
            argument.removeprefix("--unset=")
        ):
            return True

        if (
            argument.startswith("-u")
            and argument != "-u"
            and is_protected_env_var(argument.removeprefix("-u"))
        ):
            return True

        if is_protected_env_var_assignment(argument):
            return True

        if argument.startswith("-"):
            continue

        return False

    return False


def arguments_include_protected_env_var(arguments: list[str]) -> bool:
    for argument in arguments:
        if argument.startswith("-"):
            continue

        if is_protected_env_var(argument) or is_protected_env_var_assignment(argument):
            return True

    return False


def command_modifies_protected_env_var(parts) -> bool:
    words = []
    for part in parts:
        if part.kind == "assignment" and is_protected_env_var_assignment(part.word):
            return True
        if part.kind == "word":
            words.append(part.word)

    if not words:
        return False

    command, *arguments = words
    if command == "env":
        return env_command_modifies_protected_env_var(arguments)

    if command in {"export", "unset"}:
        return arguments_include_protected_env_var(arguments)

    return False


def contains_protected_env_var_override(node) -> bool:
    if node.kind == "command" and command_modifies_protected_env_var(node.parts):
        return True

    if node.kind in {"list", "pipeline"}:
        return any(contains_protected_env_var_override(part) for part in node.parts)

    return False


def check_env_overrides(command: str) -> str | None:
    reason = (
        "You may be in the wrong environment. Do not modify environment variables; "
        "use the correct environment to run the command (e.g. direnv, nix)."
    )

    try:
        nodes = bashlex.parse(command)
    except bashlex.errors.ParsingError:
        return None

    if any(contains_protected_env_var_override(node) for node in nodes):
        return reason

    return None


def deny(reason: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
        )
    )


def main() -> None:
    payload = json.load(sys.stdin)
    command = payload["tool_input"]["command"]

    for check in [check_manual_cargo_integration_test, check_env_overrides]:
        reason = check(command)
        if reason is not None:
            deny(reason)


if __name__ == "__main__":
    main()
