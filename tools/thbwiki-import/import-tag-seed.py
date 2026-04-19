#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx>=0.27,<1",
#   "python-dotenv>=1.0,<2",
# ]
# ///

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Literal
from urllib.parse import urlsplit, urlunsplit

import httpx
from dotenv import dotenv_values

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SEED = SCRIPT_DIR / "seed.tag.static.json"
DEFAULT_ENV = (SCRIPT_DIR / "../../.env").resolve()
DEFAULT_API_BASE = "http://localhost:12345"
DEFAULT_CONCURRENCY = 5
DEFAULT_REQ_PER_SEC = 5
REQUEST_TIMEOUT_SECONDS = 30.0
RETRY_DELAYS_SECONDS = (0.5, 1.0, 2.0)
RETRYABLE_STATUS_CODES = {429, 502, 503, 504}
VALID_TAG_TYPES = {
    "Descriptor",
    "Genre",
    "Movement",
    "Scene",
}
VALID_TAG_RELATION_TYPES = {
    "Derive",
    "Inherit",
}

ImportStatus = Literal["created", "skipped", "failed"]


@dataclass(slots=True)
class ImportTaskResult:
    status: ImportStatus
    item_key: str | None
    entity_id: int | None = None
    stdout_text: str | None = None
    stderr_text: str | None = None


class AsyncRateLimiter:
    def __init__(self, req_per_sec: float) -> None:
        self._interval = 1.0 / req_per_sec
        self._next_ready = 0.0
        self._cooldown_until = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            loop = asyncio.get_running_loop()
            now = loop.time()
            ready_at = max(self._next_ready, self._cooldown_until)
            if now < ready_at:
                await asyncio.sleep(ready_at - now)
                now = loop.time()
            self._next_ready = max(now, ready_at) + self._interval

    async def backoff(self, delay_seconds: float) -> None:
        if delay_seconds <= 0:
            return

        async with self._lock:
            now = asyncio.get_running_loop().time()
            cooldown_start = max(now, self._next_ready, self._cooldown_until)
            self._cooldown_until = cooldown_start + delay_seconds
            self._next_ready = max(self._next_ready, self._cooldown_until)


def is_int(value: Any) -> bool:
    return type(value) is int


def positive_int(value: str) -> int:
    parsed = int(value, 10)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive number")
    return parsed


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="uv run tools/thbwiki-import/import-tag-seed.py",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="THBWiki tag seed importer.",
        epilog=(
            "Notes:\n"
            "  This script uses built-in seed/.env paths and does not allow overriding them.\n"
            "  Without run, it only prints stats and sends no POST requests.\n"
            "  With run, it calls POST /tag."
        ),
    )
    parser.add_argument(
        "mode",
        nargs="?",
        choices=["run"],
        help="Run import mode (default is dry-run preview)",
    )
    parser.add_argument(
        "--api-base",
        default=DEFAULT_API_BASE,
        help=f"API base URL (default: {DEFAULT_API_BASE})",
    )
    parser.add_argument(
        "--admin-user",
        default=None,
        help="Admin username (default: Admin)",
    )
    parser.add_argument(
        "--admin-pass",
        default=None,
        help="Admin password (overrides .env)",
    )
    parser.add_argument(
        "--concurrency",
        type=positive_int,
        default=DEFAULT_CONCURRENCY,
        help=f"Max in-flight items per stage (default: {DEFAULT_CONCURRENCY})",
    )
    parser.add_argument(
        "--req-per-sec",
        type=positive_float,
        default=DEFAULT_REQ_PER_SEC,
        help=f"Client-side request start rate limit (default: {DEFAULT_REQ_PER_SEC:g})",
    )
    args = parser.parse_args(argv)
    args.run_mode = args.mode == "run"
    args.api_base = args.api_base.rstrip("/")
    args.api_base_explicit = any(
        arg == "--api-base" or arg.startswith("--api-base=") for arg in argv
    )
    return args


def apply_server_port(api_base: str, server_port_raw: str) -> str:
    try:
        server_port = int(server_port_raw, 10)
    except ValueError as err:
        raise RuntimeError(f"invalid SERVER_PORT value: {server_port_raw}") from err

    if server_port < 1 or server_port > 65535:
        raise RuntimeError(f"invalid SERVER_PORT value: {server_port_raw}")

    parsed = urlsplit(api_base)
    hostname = parsed.hostname
    if hostname is None:
        raise RuntimeError(f"invalid api base URL: {api_base}")

    if ":" in hostname:
        host_with_port = f"[{hostname}]:{server_port}"
    else:
        host_with_port = f"{hostname}:{server_port}"

    if parsed.username is not None:
        userinfo = parsed.username
        if parsed.password is not None:
            userinfo = f"{userinfo}:{parsed.password}"
        host_with_port = f"{userinfo}@{host_with_port}"

    return urlunsplit(
        (parsed.scheme, host_with_port, parsed.path, parsed.query, parsed.fragment)
    )


def parse_env_file(filepath: Path) -> dict[str, str]:
    if not filepath.exists():
        return {}
    parsed = dotenv_values(filepath)
    env: dict[str, str] = {}
    for key, value in parsed.items():
        if value is None:
            continue
        env[key] = value
    return env


def read_json(filepath: Path) -> Any:
    return json.loads(filepath.read_text(encoding="utf-8"))


def log_info(message: str) -> None:
    print(f"[info] {message}", file=sys.stderr)


def normalize_lookup_text(value: str) -> str:
    return " ".join(value.split()).casefold()


def normalize_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_tag_name(tag: dict[str, Any]) -> str:
    name = tag.get("name")
    if not isinstance(name, str):
        return ""
    return normalize_lookup_text(name)


def normalize_alt_names(tag: dict[str, Any]) -> list[str] | None:
    alt_names = tag.get("alt_names")
    if not isinstance(alt_names, list):
        return None

    normalized_primary = normalize_tag_name(tag)
    seen: set[str] = set()
    result: list[str] = []
    for raw_name in alt_names:
        if not isinstance(raw_name, str):
            continue
        name = raw_name.strip()
        if not name:
            continue
        normalized = normalize_lookup_text(name)
        if normalized == normalized_primary or normalized in seen:
            continue
        seen.add(normalized)
        result.append(name)

    return result or None


def get_relations(tag: dict[str, Any]) -> list[dict[str, Any]]:
    relations = tag.get("relations")
    if not isinstance(relations, list):
        return []
    return [relation for relation in relations if isinstance(relation, dict)]


def validate_seed(seed: Any) -> None:
    if not isinstance(seed, dict):
        raise RuntimeError("seed file must be a JSON object")
    if not isinstance(seed.get("tags"), list):
        raise RuntimeError("seed.tags must be an array")

    seen_names: set[str] = set()
    for tag in seed["tags"]:
        if not isinstance(tag, dict):
            raise RuntimeError("tag item must be an object")

        name = normalize_optional_text(tag.get("name"))
        if name is None:
            raise RuntimeError("tag.name must be a non-empty string")

        normalized_name = normalize_lookup_text(name)
        if normalized_name in seen_names:
            raise RuntimeError(f"duplicate tag name: {name}")
        seen_names.add(normalized_name)

        tag_type = tag.get("type")
        if not isinstance(tag_type, str) or tag_type not in VALID_TAG_TYPES:
            raise RuntimeError(f"invalid tag.type for name={name}: {tag_type!r}")

        for field_name in ("short_description", "description"):
            value = tag.get(field_name)
            if value is not None and not isinstance(value, str):
                raise RuntimeError(
                    f"tag.{field_name} must be a string or null for name={name}"
                )

        alt_names = tag.get("alt_names")
        if alt_names is not None and not isinstance(alt_names, list):
            raise RuntimeError(f"tag.alt_names must be an array for name={name}")
        if isinstance(alt_names, list):
            seen_alt_names: set[str] = set()
            for raw_alt_name in alt_names:
                if not isinstance(raw_alt_name, str) or not raw_alt_name.strip():
                    raise RuntimeError(
                        f"tag.alt_names contains invalid value for name={name}"
                    )
                normalized_alt_name = normalize_lookup_text(raw_alt_name)
                if normalized_alt_name == normalized_name:
                    raise RuntimeError(
                        f"tag.alt_names duplicates tag.name for name={name}"
                    )
                if normalized_alt_name in seen_alt_names:
                    raise RuntimeError(
                        f"duplicate tag.alt_names entry for name={name}: {raw_alt_name.strip()}"
                    )
                seen_alt_names.add(normalized_alt_name)

        relations = tag.get("relations")
        if relations is not None and not isinstance(relations, list):
            raise RuntimeError(f"tag.relations must be an array for name={name}")
        if isinstance(relations, list):
            seen_relations: set[tuple[str, str]] = set()
            for relation in relations:
                if not isinstance(relation, dict):
                    raise RuntimeError(f"tag relation must be an object for name={name}")
                related_tag_name = normalize_optional_text(relation.get("related_tag_name"))
                if related_tag_name is None:
                    raise RuntimeError(
                        f"relation.related_tag_name must be a non-empty string for name={name}"
                    )
                if normalize_lookup_text(related_tag_name) == normalized_name:
                    raise RuntimeError(f"self relation is not allowed for name={name}")
                relation_type = relation.get("type")
                if (
                    not isinstance(relation_type, str)
                    or relation_type not in VALID_TAG_RELATION_TYPES
                ):
                    raise RuntimeError(
                        f"invalid relation.type for name={name}: {relation_type!r}"
                    )
                relation_key = (normalize_lookup_text(related_tag_name), relation_type)
                if relation_key in seen_relations:
                    raise RuntimeError(
                        f"duplicate relation for name={name}: {related_tag_name} {relation_type}"
                    )
                seen_relations.add(relation_key)


def try_parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def unwrap_api_data(payload: Any) -> Any:
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def parse_retry_delay_seconds(
    response: httpx.Response,
    response_text: str,
    fallback_delay: float,
) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after is not None:
        try:
            retry_after_seconds = float(retry_after)
        except ValueError:
            retry_after_seconds = 0.0
        if retry_after_seconds > 0:
            return retry_after_seconds

    reset_after = response.headers.get("X-RateLimit-Reset-After")
    if reset_after is not None:
        try:
            reset_after_seconds = float(reset_after)
        except ValueError:
            reset_after_seconds = 0.0
        if reset_after_seconds > 0:
            return reset_after_seconds

    match = re.search(r"Wait for ([0-9]+(?:\.[0-9]+)?)s", response_text)
    if match is not None:
        wait_seconds = float(match.group(1))
        if wait_seconds > 0:
            return wait_seconds

    return fallback_delay


async def request_json(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    method: str,
    endpoint: str,
    params: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
    auth_header: str = "",
) -> Any:
    headers: dict[str, str] = {}
    if auth_header:
        headers["Authorization"] = auth_header
    if payload is not None:
        headers["Content-Type"] = "application/json"

    retry_on_request_error = method == "GET"
    retryable_status_codes = {429}
    if method == "GET":
        retryable_status_codes = RETRYABLE_STATUS_CODES

    max_attempts = len(RETRY_DELAYS_SECONDS) + 1
    for attempt in range(max_attempts):
        await limiter.acquire()
        try:
            response = await client.request(
                method,
                endpoint,
                params=params,
                headers=headers or None,
                json=payload,
            )
        except httpx.RequestError as err:
            if retry_on_request_error and attempt < len(RETRY_DELAYS_SECONDS):
                delay = RETRY_DELAYS_SECONDS[attempt]
                log_info(
                    f"[retry] method={method} endpoint={endpoint} reason={type(err).__name__} attempt={attempt + 1} delay={delay}s"
                )
                await asyncio.sleep(delay)
                continue
            raise RuntimeError(f"{type(err).__name__} at {endpoint}: {err}") from err

        text = response.text
        parsed = try_parse_json(text) if text else None
        if response.is_error:
            if response.status_code in retryable_status_codes and attempt < len(
                RETRY_DELAYS_SECONDS
            ):
                delay = RETRY_DELAYS_SECONDS[attempt]
                if response.status_code == 429:
                    delay = parse_retry_delay_seconds(response, text, delay)
                    await limiter.backoff(delay)
                else:
                    await asyncio.sleep(delay)
                log_info(
                    f"[retry] method={method} endpoint={endpoint} status={response.status_code} attempt={attempt + 1} delay={delay}s"
                )
                continue
            message = json.dumps(parsed, ensure_ascii=False) if parsed is not None else text
            raise RuntimeError(
                f"HTTP {response.status_code} {response.reason_phrase} at {endpoint}: {message}"
            )
        return unwrap_api_data(parsed)

    raise RuntimeError(f"request exhausted retries at {endpoint}")


async def get_json(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    endpoint: str,
    params: dict[str, Any] | None = None,
) -> Any:
    return await request_json(client, limiter, "GET", endpoint, params=params)


async def post_json(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    endpoint: str,
    payload: dict[str, Any],
    auth_header: str,
) -> Any:
    return await request_json(
        client,
        limiter,
        "POST",
        endpoint,
        payload=payload,
        auth_header=auth_header,
    )


def normalize_relation_name(relation: dict[str, Any]) -> str:
    name = relation.get("related_tag_name")
    if not isinstance(name, str):
        return ""
    return normalize_lookup_text(name)


async def find_existing_tag_id(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    tag_name: str,
    tag_type: str,
) -> int | None:
    response_data = await get_json(client, limiter, "/tag", params={"keyword": tag_name})
    if not isinstance(response_data, list):
        return None

    target_name = normalize_lookup_text(tag_name)
    exact_name_matches: set[int] = set()
    exact_alt_name_matches: set[int] = set()

    for item in response_data:
        if not isinstance(item, dict):
            continue
        entity_id = item.get("id")
        name = item.get("name")
        item_type = item.get("type")
        if (
            not is_int(entity_id)
            or not isinstance(name, str)
            or not isinstance(item_type, str)
        ):
            continue
        if item_type != tag_type:
            continue

        if normalize_lookup_text(name) == target_name:
            exact_name_matches.add(entity_id)
            continue

        alt_names = item.get("alt_names")
        if not isinstance(alt_names, list):
            continue
        for alt_name in alt_names:
            if not isinstance(alt_name, dict):
                continue
            alt_name_text = alt_name.get("name")
            if (
                isinstance(alt_name_text, str)
                and normalize_lookup_text(alt_name_text) == target_name
            ):
                exact_alt_name_matches.add(entity_id)
                break

    if len(exact_name_matches) > 1:
        raise RuntimeError(f"ambiguous exact tag match for name={tag_name}")
    if len(exact_name_matches) == 1:
        return next(iter(exact_name_matches))

    if len(exact_alt_name_matches) > 1:
        raise RuntimeError(f"ambiguous alt-name tag match for name={tag_name}")
    if len(exact_alt_name_matches) == 1:
        return next(iter(exact_alt_name_matches))

    return None


def build_tag_payload(
    tag: dict[str, Any],
    relation_ids: list[int],
) -> dict[str, Any]:
    relations = get_relations(tag)

    return {
        "data": {
            "name": str(tag["name"]).strip(),
            "type": tag["type"],
            "short_description": normalize_optional_text(tag.get("short_description")),
            "description": normalize_optional_text(tag.get("description")),
            "alt_names": normalize_alt_names(tag),
            "relations": [
                {
                    "related_tag_id": related_tag_id,
                    "type": relation["type"],
                }
                for relation, related_tag_id in zip(relations, relation_ids, strict=True)
            ]
            or None,
        },
        "description": f"seed:tag={str(tag['name']).strip()};source=THBWiki",
        "type": "Create",
    }


def build_tag_payload_plan(
    tag: dict[str, Any],
    relation_refs: list[int | str],
) -> dict[str, Any]:
    relations = get_relations(tag)

    return {
        "data": {
            "name": str(tag["name"]).strip(),
            "type": tag["type"],
            "short_description": normalize_optional_text(tag.get("short_description")),
            "description": normalize_optional_text(tag.get("description")),
            "alt_names": normalize_alt_names(tag),
            "relations": [
                {
                    "related_tag_id": related_tag_ref,
                    "type": relation["type"],
                }
                for relation, related_tag_ref in zip(
                    relations, relation_refs, strict=True
                )
            ]
            or None,
        },
        "description": f"seed:tag={str(tag['name']).strip()};source=THBWiki",
        "type": "Create",
    }


def serialize_plan(method: str, url: str, body: dict[str, Any]) -> str:
    return json.dumps(
        {
            "method": method,
            "url": url,
            "body": body,
        },
        ensure_ascii=False,
    )


def extract_entity_id(response_body: Any) -> int | None:
    if not isinstance(response_body, dict):
        return None
    entity_id = response_body.get("entity_id")
    if is_int(entity_id):
        return entity_id
    data = response_body.get("data")
    if isinstance(data, dict) and is_int(data.get("entity_id")):
        return data["entity_id"]
    return None


def unresolved_relation_names(
    tag: dict[str, Any],
    tag_id_by_name: dict[str, int],
) -> list[str]:
    unresolved: list[str] = []
    for relation in get_relations(tag):
        normalized_name = normalize_relation_name(relation)
        if normalized_name and normalized_name not in tag_id_by_name:
            unresolved.append(str(relation["related_tag_name"]).strip())
    return unresolved


def resolve_relation_ids(
    tag: dict[str, Any],
    tag_id_by_name: dict[str, int],
) -> list[int]:
    return [
        tag_id_by_name[normalize_relation_name(relation)]
        for relation in get_relations(tag)
    ]


async def process_tag_create(
    tag: dict[str, Any],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    auth_header: str,
    relation_ids: list[int],
) -> ImportTaskResult:
    name = str(tag["name"]).strip()
    try:
        existing_id = await find_existing_tag_id(client, limiter, name, tag["type"])
        if is_int(existing_id):
            return ImportTaskResult(
                status="skipped",
                item_key=name,
                entity_id=existing_id,
                stderr_text=f"[info] [tag][skip] name={name} tag_id={existing_id}",
            )

        response_body = await post_json(
            client,
            limiter,
            "/tag",
            build_tag_payload(tag, relation_ids),
            auth_header,
        )
        entity_id = extract_entity_id(response_body)
        if not is_int(entity_id):
            raise RuntimeError(
                f"cannot extract entity_id from /tag response for name={name}"
            )

        return ImportTaskResult(
            status="created",
            item_key=name,
            entity_id=entity_id,
            stderr_text=f"[info] [tag][created] name={name} tag_id={entity_id}",
        )
    except Exception as err:
        return ImportTaskResult(
            status="failed",
            item_key=name,
            stderr_text=f"[tag][failed] name={name} error={err}",
        )


async def run_stage(
    items: list[Any],
    concurrency: int,
    worker: Callable[[Any], Awaitable[ImportTaskResult]],
    key_fn: Callable[[Any], Any] | None = None,
) -> list[ImportTaskResult]:
    semaphore = asyncio.Semaphore(concurrency)
    keyed_locks: dict[Any, asyncio.Lock] = {}

    async def run_one(item: Any) -> ImportTaskResult:
        if key_fn is None:
            async with semaphore:
                return await worker(item)

        key = key_fn(item)
        item_lock = keyed_locks.get(key)
        if item_lock is None:
            item_lock = asyncio.Lock()
            keyed_locks[key] = item_lock

        async with item_lock:
            async with semaphore:
                return await worker(item)

    tasks = [asyncio.create_task(run_one(item)) for item in items]
    results: list[ImportTaskResult] = []
    try:
        for task in asyncio.as_completed(tasks):
            result = await task
            if result.stderr_text is not None:
                print(result.stderr_text, file=sys.stderr)
            if result.stdout_text is not None:
                print(result.stdout_text)
            results.append(result)
    finally:
        pending_tasks = [task for task in tasks if not task.done()]
        for task in pending_tasks:
            task.cancel()
        if pending_tasks:
            await asyncio.gather(*pending_tasks, return_exceptions=True)
    return results


def count_results(results: list[ImportTaskResult]) -> tuple[int, int, int]:
    created = 0
    skipped = 0
    failed = 0
    for result in results:
        if result.status == "created":
            created += 1
        elif result.status == "skipped":
            skipped += 1
        else:
            failed += 1
    return created, skipped, failed


async def collect_existing_tag_ids(
    seed_tags: list[dict[str, Any]],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
) -> tuple[dict[str, int], list[ImportTaskResult]]:
    tag_id_by_name: dict[str, int] = {}
    results: list[ImportTaskResult] = []

    for tag in seed_tags:
        name = str(tag["name"]).strip()
        existing_id = await find_existing_tag_id(client, limiter, name, tag["type"])
        if not is_int(existing_id):
            continue

        normalized_name = normalize_lookup_text(name)
        tag_id_by_name[normalized_name] = existing_id
        result = ImportTaskResult(
            status="skipped",
            item_key=name,
            entity_id=existing_id,
            stderr_text=f"[info] [tag][skip] name={name} tag_id={existing_id}",
        )
        results.append(result)
        print(result.stderr_text, file=sys.stderr)

    return tag_id_by_name, results


def plan_tag_imports(
    seed_tags: list[dict[str, Any]],
    api_base: str,
    existing_tag_ids: dict[str, int],
) -> list[ImportTaskResult]:
    tag_ref_by_name: dict[str, int | str] = dict(existing_tag_ids)

    for tag in seed_tags:
        normalized_name = normalize_tag_name(tag)
        if normalized_name not in tag_ref_by_name:
            tag_ref_by_name[normalized_name] = (
                f"<tag_id for name={str(tag['name']).strip()}>"
            )

    results: list[ImportTaskResult] = []
    for tag in seed_tags:
        name = str(tag["name"]).strip()
        normalized_name = normalize_lookup_text(name)
        if normalized_name in existing_tag_ids:
            continue

        unknown_relations = [
            str(relation["related_tag_name"]).strip()
            for relation in get_relations(tag)
            if normalize_relation_name(relation) not in tag_ref_by_name
        ]
        if unknown_relations:
            results.append(
                ImportTaskResult(
                    status="failed",
                    item_key=name,
                    stderr_text=(
                        f"[tag][failed] name={name} unresolved_relations={unknown_relations}"
                    ),
                )
            )
            continue

        relation_refs = [
            tag_ref_by_name.get(
                normalize_relation_name(relation),
                f"<tag_id for name={str(relation['related_tag_name']).strip()}>",
            )
            for relation in get_relations(tag)
        ]

        results.append(
            ImportTaskResult(
                status="created",
                item_key=name,
                stdout_text=serialize_plan(
                    "POST",
                    f"{api_base}/tag",
                    build_tag_payload_plan(tag, relation_refs),
                ),
                stderr_text=f"[info] [tag][plan] name={name}",
            )
        )

    return results


async def import_tags(
    seed_tags: list[dict[str, Any]],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter,
    auth_header: str,
    concurrency: int,
    existing_tag_ids: dict[str, int],
) -> list[ImportTaskResult]:
    results: list[ImportTaskResult] = []
    pending_tags = [
        tag
        for tag in seed_tags
        if normalize_tag_name(tag) not in existing_tag_ids
    ]
    tag_id_by_name = dict(existing_tag_ids)

    while pending_tags:
        ready_tags: list[dict[str, Any]] = []
        blocked_tags: list[dict[str, Any]] = []

        for tag in pending_tags:
            if unresolved_relation_names(tag, tag_id_by_name):
                blocked_tags.append(tag)
            else:
                ready_tags.append(tag)

        if not ready_tags:
            for tag in blocked_tags:
                name = str(tag["name"]).strip()
                unresolved = unresolved_relation_names(tag, tag_id_by_name)
                results.append(
                    ImportTaskResult(
                        status="failed",
                        item_key=name,
                        stderr_text=(
                            f"[tag][failed] name={name} unresolved_relations={unresolved}"
                        ),
                    )
                )
            break

        stage_results = await run_stage(
            ready_tags,
            concurrency,
            lambda tag: process_tag_create(
                tag,
                client,
                limiter,
                auth_header,
                resolve_relation_ids(tag, tag_id_by_name),
            ),
            lambda tag: normalize_tag_name(tag),
        )
        results.extend(stage_results)

        for result in stage_results:
            if is_int(result.entity_id) and isinstance(result.item_key, str):
                tag_id_by_name[normalize_lookup_text(result.item_key)] = result.entity_id

        pending_tags = blocked_tags

    return results


async def async_main(argv: list[str]) -> int:
    options = parse_args(argv)
    seed = read_json(DEFAULT_SEED)
    validate_seed(seed)
    seed_tags = [tag for tag in seed["tags"] if isinstance(tag, dict)]

    env_from_file = parse_env_file(DEFAULT_ENV)
    server_port = os.getenv("SERVER_PORT") or env_from_file.get("SERVER_PORT")
    if server_port and not options.api_base_explicit:
        options.api_base = apply_server_port(options.api_base, server_port)
    admin_user = options.admin_user or env_from_file.get("ADMIN_USERNAME") or "Admin"
    admin_pass = options.admin_pass or env_from_file.get("ADMIN_PASSWORD")

    dry_run = not options.run_mode
    if not dry_run and not admin_pass:
        raise RuntimeError("ADMIN_PASSWORD not found. Set it in .env or pass --admin-pass")

    auth_header = ""
    if not dry_run:
        auth_header = (
            f"Basic {base64.b64encode(f'{admin_user}:{admin_pass}'.encode()).decode()}"
        )

    log_info(
        "start "
        f"mode={'dry-run' if dry_run else 'run'} "
        f"api_base={options.api_base} "
        f"seed={DEFAULT_SEED} "
        f"concurrency={options.concurrency} "
        f"req_per_sec={options.req_per_sec:g}"
    )

    limiter = AsyncRateLimiter(options.req_per_sec)
    limits = httpx.Limits(
        max_connections=options.concurrency,
        max_keepalive_connections=options.concurrency,
    )

    async with httpx.AsyncClient(
        base_url=options.api_base,
        timeout=REQUEST_TIMEOUT_SECONDS,
        limits=limits,
    ) as client:
        existing_tag_ids, existing_results = await collect_existing_tag_ids(
            seed_tags, client, limiter
        )

        if dry_run:
            planned_results = plan_tag_imports(
                seed_tags, options.api_base, existing_tag_ids
            )
            for result in planned_results:
                if result.stderr_text is not None:
                    print(result.stderr_text, file=sys.stderr)
                if result.stdout_text is not None:
                    print(result.stdout_text)
            all_results = [*existing_results, *planned_results]
        else:
            import_results = await import_tags(
                seed_tags,
                client,
                limiter,
                auth_header,
                options.concurrency,
                existing_tag_ids,
            )
            for result in import_results:
                if result.status == "failed" and result.stderr_text is not None:
                    print(result.stderr_text, file=sys.stderr)
            all_results = [*existing_results, *import_results]

    created, skipped, failed = count_results(all_results)

    if dry_run:
        print(
            f"tags total={len(seed_tags)} create={created} skip={skipped} failed={failed}",
            file=sys.stderr,
        )
        print(f"seed: {DEFAULT_SEED}", file=sys.stderr)
        return 0 if failed == 0 else 1

    print(f"tags created={created} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 1


def main(argv: list[str]) -> int:
    try:
        return asyncio.run(async_main(argv))
    except (KeyboardInterrupt, asyncio.CancelledError):
        log_info("interrupted by user")
        return 130


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)
