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
from datetime import date
from pathlib import Path
from typing import Any, Awaitable, Callable, Literal
from urllib.parse import urlsplit, urlunsplit

import httpx
from dotenv import dotenv_values

from import_rate_limit import (
    build_import_rate_limit_config,
    raise_import_rate_limit_token_error,
)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SEED = SCRIPT_DIR / "seed.static.json"
DEFAULT_ENV = (SCRIPT_DIR / "../../.env").resolve()
DEFAULT_API_BASE = "http://localhost:12345"
DEFAULT_CONCURRENCY = 5
DEFAULT_REQ_PER_SEC = 5
REQUEST_TIMEOUT_SECONDS = 30.0
RETRY_DELAYS_SECONDS = (0.5, 1.0, 2.0)
RETRYABLE_STATUS_CODES = {429, 502, 503, 504}
VALID_RELEASE_TYPES = {
    "Album",
    "Ep",
    "Single",
    "Compilation",
    "Demo",
    "Other",
}

ImportStatus = Literal["created", "skipped", "failed"]


@dataclass(slots=True)
class ImportTaskResult:
    status: ImportStatus
    item_key: str | int | None
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
        prog="uv run tools/thbwiki-import/import-seed.py",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="THBWiki seed importer.",
        epilog=(
            "Notes:\n"
            "  This script uses built-in seed/.env paths and does not allow overriding them.\n"
            "  Without run, it only prints stats and sends no POST requests.\n"
            "  With run, it calls POST /artist, POST /song, and POST /release."
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
        "--import-token",
        default=None,
        help="Import rate-limit bypass token (default: IMPORT_BYPASS_TOKEN)",
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
    args.req_per_sec_explicit = any(
        arg == "--req-per-sec" or arg.startswith("--req-per-sec=") for arg in argv
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


def resolve_release_type(release: dict[str, Any]) -> str:
    value = release.get("release_type")
    if value is None:
        return "Album"
    if not isinstance(value, str) or value not in VALID_RELEASE_TYPES:
        thb_album_id = release.get("thb_album_id")
        raise RuntimeError(
            f"invalid release_type for thb_album_id={thb_album_id}: {value!r}"
        )
    return value


def build_release_date_payload(
    release: dict[str, Any],
) -> dict[str, str] | None:
    raw_release_date = release.get("release_date")
    if raw_release_date is None:
        return None

    if not isinstance(raw_release_date, str) or not raw_release_date.strip():
        thb_album_id = release.get("thb_album_id")
        raise RuntimeError(
            f"invalid release_date for thb_album_id={thb_album_id}: {raw_release_date!r}"
        )

    normalized = raw_release_date.strip()
    try:
        date.fromisoformat(normalized)
    except ValueError as err:
        thb_album_id = release.get("thb_album_id")
        raise RuntimeError(
            f"invalid release_date for thb_album_id={thb_album_id}: {normalized!r}"
        ) from err

    return {
        "value": normalized,
        "precision": "Day",
    }


def validate_seed(seed: Any) -> None:
    if not isinstance(seed, dict):
        raise RuntimeError("seed file must be a JSON object")
    if not isinstance(seed.get("artists"), list):
        raise RuntimeError("seed.artists must be an array")
    if not isinstance(seed.get("songs"), list):
        raise RuntimeError("seed.songs must be an array")
    if not isinstance(seed.get("releases"), list):
        raise RuntimeError("seed.releases must be an array")

    artist_names: set[str] = set()
    for artist in seed["artists"]:
        if not isinstance(artist, dict):
            raise RuntimeError("artist item must be an object")
        name = artist.get("name")
        if not isinstance(name, str) or not name.strip():
            raise RuntimeError("artist.name must be a non-empty string")
        trimmed = name.strip()
        if trimmed in artist_names:
            raise RuntimeError(f"duplicate artist name: {trimmed}")
        artist_names.add(trimmed)

    song_ids: set[int] = set()
    for song in seed["songs"]:
        if not isinstance(song, dict):
            raise RuntimeError("song item must be an object")
        thb_song_id = song.get("thb_song_id")
        if not is_int(thb_song_id):
            raise RuntimeError("song.thb_song_id must be integer")
        if thb_song_id in song_ids:
            raise RuntimeError(f"duplicate thb_song_id: {thb_song_id}")
        song_ids.add(thb_song_id)
        title = song.get("title")
        if not isinstance(title, str) or not title.strip():
            raise RuntimeError(f"invalid song title for thb_song_id={thb_song_id}")

    release_ids: set[int] = set()
    for release in seed["releases"]:
        if not isinstance(release, dict):
            raise RuntimeError("release item must be an object")

        thb_album_id = release.get("thb_album_id")
        if not is_int(thb_album_id):
            raise RuntimeError("release.thb_album_id must be integer")
        if thb_album_id in release_ids:
            raise RuntimeError(f"duplicate thb_album_id: {thb_album_id}")
        release_ids.add(thb_album_id)

        title = release.get("title")
        if not isinstance(title, str) or not title.strip():
            raise RuntimeError(f"invalid release title for thb_album_id={thb_album_id}")

        resolve_release_type(release)
        build_release_date_payload(release)

        tracks = release.get("tracks")
        if not isinstance(tracks, list) or len(tracks) == 0:
            raise RuntimeError(f"release {thb_album_id} has empty tracks")

        circle_names = release.get("circle_names")
        if not isinstance(circle_names, list):
            circle_names = []
        for raw in circle_names:
            if not isinstance(raw, str):
                continue
            name = raw.strip()
            if not name:
                continue
            if name not in artist_names:
                raise RuntimeError(
                    f"release {thb_album_id} references unknown artist name: {name}"
                )

        for track in tracks:
            if not isinstance(track, dict) or not is_int(track.get("thb_song_id")):
                raise RuntimeError(
                    f"release {thb_album_id} has invalid track.thb_song_id"
                )
            thb_song_id = track["thb_song_id"]
            if thb_song_id not in song_ids:
                raise RuntimeError(
                    f"release {thb_album_id} references unknown thb_song_id={thb_song_id}"
                )


def build_artist_payload(circle_name: str) -> dict[str, Any]:
    name = str(circle_name).strip()
    return {
        "data": {
            "name": name,
            "artist_type": "Unknown",
        },
        "description": f"seed:circle={name};source=THBWiki",
        "type": "Create",
    }


def build_song_payload(song: dict[str, Any]) -> dict[str, Any]:
    return {
        "data": {
            "title": song["title"].strip(),
        },
        "description": f"seed:thb_song_id={song['thb_song_id']};source=THBWiki",
        "type": "Create",
    }


def to_nullable_int(value: Any) -> int | None:
    return value if is_int(value) else None


def build_release_payload(
    release: dict[str, Any],
    song_id_by_thb_song_id: dict[int, int],
    artist_id_by_name: dict[str, int],
) -> dict[str, Any]:
    release_artists: list[int] = []
    circle_names = release.get("circle_names")
    if not isinstance(circle_names, list):
        circle_names = []
    for raw_circle_name in circle_names:
        name = raw_circle_name.strip() if isinstance(raw_circle_name, str) else ""
        if not name:
            continue
        artist_id = artist_id_by_name.get(name)
        if not is_int(artist_id):
            raise RuntimeError(f"missing artist_id for circle={name}")
        release_artists.append(artist_id)

    mapped_tracks: list[dict[str, Any]] = []
    for track in release["tracks"]:
        mapped_song_id = song_id_by_thb_song_id.get(track["thb_song_id"])
        if not is_int(mapped_song_id):
            raise RuntimeError(
                f"missing mapped song_id for thb_song_id={track['thb_song_id']}"
            )

        disc_no = track.get("disc_no")
        if not is_int(disc_no) or disc_no <= 0:
            disc_no = 1

        track_no = track.get("track_no")
        track_number = None if track_no is None else str(track_no)

        mapped_tracks.append(
            {
                "song_id": mapped_song_id,
                "track_number": track_number,
                "display_title": None,
                "duration": to_nullable_int(track.get("duration_seconds")),
                "disc_index": disc_no - 1,
                "artists": [],
            }
        )

    max_disc_no = max((track["disc_index"] + 1 for track in mapped_tracks), default=1)
    discs = [{"name": None} for _ in range(max_disc_no)]

    return {
        "data": {
            "title": release["title"].strip(),
            "release_type": resolve_release_type(release),
            "release_date": build_release_date_payload(release),
            "recording_date_start": None,
            "recording_date_end": None,
            "artists": release_artists,
            "catalog_nums": [],
            "credits": [],
            "discs": discs,
            "events": [],
            "localized_titles": [],
            "tracks": mapped_tracks,
        },
        "description": (f"seed:thb_album_id={release['thb_album_id']};source=THBWiki"),
        "type": "Create",
    }


def build_release_payload_plan(
    release: dict[str, Any],
    song_id_by_thb_song_id: dict[int, int],
    artist_id_by_name: dict[str, int],
) -> dict[str, Any]:
    release_artists: list[int | str] = []
    circle_names = release.get("circle_names")
    if not isinstance(circle_names, list):
        circle_names = []
    for raw_circle_name in circle_names:
        name = raw_circle_name.strip() if isinstance(raw_circle_name, str) else ""
        if not name:
            continue
        artist_id = artist_id_by_name.get(name)
        release_artists.append(
            artist_id if is_int(artist_id) else f"<artist_id for circle={name}>"
        )

    mapped_tracks: list[dict[str, Any]] = []
    for track in release["tracks"]:
        mapped_song_id = song_id_by_thb_song_id.get(track["thb_song_id"])
        song_id: int | str = (
            mapped_song_id
            if is_int(mapped_song_id)
            else f"<song_id for thb_song_id={track['thb_song_id']}>"
        )

        disc_no = track.get("disc_no")
        if not is_int(disc_no) or disc_no <= 0:
            disc_no = 1

        track_no = track.get("track_no")
        track_number = None if track_no is None else str(track_no)

        mapped_tracks.append(
            {
                "song_id": song_id,
                "track_number": track_number,
                "display_title": None,
                "duration": to_nullable_int(track.get("duration_seconds")),
                "disc_index": disc_no - 1,
                "artists": [],
            }
        )

    max_disc_no = max((track["disc_index"] + 1 for track in mapped_tracks), default=1)
    discs = [{"name": None} for _ in range(max_disc_no)]

    return {
        "data": {
            "title": release["title"].strip(),
            "release_type": resolve_release_type(release),
            "release_date": build_release_date_payload(release),
            "recording_date_start": None,
            "recording_date_end": None,
            "artists": release_artists,
            "catalog_nums": [],
            "credits": [],
            "discs": discs,
            "events": [],
            "localized_titles": [],
            "tracks": mapped_tracks,
        },
        "description": (f"seed:thb_album_id={release['thb_album_id']};source=THBWiki"),
        "type": "Create",
    }


def try_parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def unwrap_api_data(payload: Any) -> Any:
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def log_info(message: str) -> None:
    print(f"[info] {message}")


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
    limiter: AsyncRateLimiter | None,
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
        if limiter is not None:
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
            if response.status_code == 429 and limiter is None:
                raise_import_rate_limit_token_error(endpoint)
            if response.status_code in retryable_status_codes and attempt < len(
                RETRY_DELAYS_SECONDS
            ):
                delay = RETRY_DELAYS_SECONDS[attempt]
                if response.status_code == 429:
                    delay = parse_retry_delay_seconds(response, text, delay)
                    if limiter is not None:
                        await limiter.backoff(delay)
                    else:
                        await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(delay)
                log_info(
                    f"[retry] method={method} endpoint={endpoint} status={response.status_code} attempt={attempt + 1} delay={delay}s"
                )
                continue
            message = (
                json.dumps(parsed, ensure_ascii=False) if parsed is not None else text
            )
            raise RuntimeError(
                f"HTTP {response.status_code} {response.reason_phrase} at {endpoint}: {message}"
            )
        return unwrap_api_data(parsed)

    raise RuntimeError(f"request exhausted retries at {endpoint}")


async def get_json(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    endpoint: str,
    params: dict[str, Any] | None = None,
) -> Any:
    return await request_json(client, limiter, "GET", endpoint, params=params)


async def post_json(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
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


def normalize_lookup_text(value: str) -> str:
    return " ".join(value.split()).casefold()


def build_song_title_by_thb_song_id(seed: dict[str, Any]) -> dict[int, str]:
    result: dict[int, str] = {}
    for song in seed["songs"]:
        if not isinstance(song, dict):
            continue
        thb_song_id = song.get("thb_song_id")
        title = song.get("title")
        if not is_int(thb_song_id) or not isinstance(title, str):
            continue
        result[thb_song_id] = title
    return result


def normalize_track_number(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return str(int(text))
    return " ".join(text.split()).casefold()


def build_song_expected_release_keys(
    seed: dict[str, Any],
) -> dict[int, set[tuple[str, str | None]]]:
    expected: dict[int, set[tuple[str, str | None]]] = {}
    for release in seed["releases"]:
        title = release.get("title")
        if not isinstance(title, str):
            continue
        normalized_title = normalize_lookup_text(title)
        tracks = release.get("tracks")
        if not isinstance(tracks, list):
            continue
        for track in tracks:
            if not isinstance(track, dict):
                continue
            thb_song_id = track.get("thb_song_id")
            if not is_int(thb_song_id):
                continue
            if thb_song_id not in expected:
                expected[thb_song_id] = set()
            expected[thb_song_id].add(
                (normalized_title, normalize_track_number(track.get("track_no")))
            )
    return expected


async def find_existing_artist_id(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    artist_name: str,
) -> int | None:
    response_data = await get_json(
        client, limiter, "/artist", params={"keyword": artist_name}
    )
    if not isinstance(response_data, list):
        return None

    target = normalize_lookup_text(artist_name)
    matched_ids: set[int] = set()
    for item in response_data:
        if not isinstance(item, dict):
            continue
        entity_id = item.get("id")
        name = item.get("name")
        if not is_int(entity_id) or not isinstance(name, str):
            continue
        if normalize_lookup_text(name) == target:
            matched_ids.add(entity_id)

    if len(matched_ids) > 1:
        raise RuntimeError(f"ambiguous artist match for name={artist_name}")
    if len(matched_ids) == 1:
        return next(iter(matched_ids))
    return None


async def find_existing_song_id(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    song_title: str,
    expected_release_keys: set[tuple[str, str | None]],
) -> int | None:
    response_data = await get_json(
        client, limiter, "/song", params={"keyword": song_title}
    )
    if not isinstance(response_data, list):
        return None

    target = normalize_lookup_text(song_title)
    matched_ids: list[tuple[int, set[tuple[str, str | None]]]] = []
    for item in response_data:
        if not isinstance(item, dict):
            continue
        entity_id = item.get("id")
        title = item.get("title")
        if not is_int(entity_id) or not isinstance(title, str):
            continue
        if normalize_lookup_text(title) == target:
            release_keys: set[tuple[str, str | None]] = set()
            releases = item.get("releases")
            if isinstance(releases, list):
                for release in releases:
                    if not isinstance(release, dict):
                        continue
                    release_title = release.get("title")
                    if not isinstance(release_title, str):
                        continue
                    release_keys.add(
                        (
                            normalize_lookup_text(release_title),
                            normalize_track_number(release.get("track_number")),
                        )
                    )
            matched_ids.append((entity_id, release_keys))

    if len(matched_ids) == 1:
        entity_id, release_keys = matched_ids[0]
        if not expected_release_keys:
            return entity_id
        if not release_keys:
            return entity_id
        if release_keys.intersection(expected_release_keys):
            return entity_id
        return None

    if len(matched_ids) > 1 and expected_release_keys:
        by_release_keys = [
            (
                entity_id,
                release_keys.intersection(expected_release_keys),
            )
            for entity_id, release_keys in matched_ids
        ]
        by_release_keys = [
            (entity_id, release_keys)
            for entity_id, release_keys in by_release_keys
            if release_keys
        ]

        if len(by_release_keys) == 1:
            return by_release_keys[0][0]

    if len(matched_ids) > 1:
        return None
    return None


def release_expected_signature(
    release: dict[str, Any],
    song_id_by_thb_song_id: dict[int, int],
    artist_id_by_name: dict[str, int],
) -> tuple[tuple[int, ...], tuple[tuple[int, str | None, int], ...]]:
    circle_names = release.get("circle_names")
    if not isinstance(circle_names, list):
        circle_names = []

    artist_ids: list[int] = []
    for raw_circle_name in circle_names:
        name = raw_circle_name.strip() if isinstance(raw_circle_name, str) else ""
        if not name:
            continue
        artist_id = artist_id_by_name.get(name)
        if not is_int(artist_id):
            raise RuntimeError(f"missing artist_id for circle={name}")
        artist_ids.append(artist_id)

    tracks_signature: list[tuple[int, str | None, int]] = []
    for track in release["tracks"]:
        mapped_song_id = song_id_by_thb_song_id.get(track["thb_song_id"])
        if not is_int(mapped_song_id):
            raise RuntimeError(
                f"missing mapped song_id for thb_song_id={track['thb_song_id']}"
            )
        disc_no = track.get("disc_no")
        if not is_int(disc_no) or disc_no <= 0:
            disc_no = 1
        track_no = track.get("track_no")
        track_number = None if track_no is None else str(track_no)
        tracks_signature.append((disc_no - 1, track_number, mapped_song_id))

    return tuple(sorted(artist_ids)), tuple(sorted(tracks_signature))


def release_expected_title_signature(
    release: dict[str, Any],
    song_title_by_thb_song_id: dict[int, str],
    artist_id_by_name: dict[str, int],
) -> tuple[tuple[int, ...], tuple[tuple[int, str | None, str], ...]]:
    circle_names = release.get("circle_names")
    if not isinstance(circle_names, list):
        circle_names = []

    artist_ids: list[int] = []
    for raw_circle_name in circle_names:
        name = raw_circle_name.strip() if isinstance(raw_circle_name, str) else ""
        if not name:
            continue
        artist_id = artist_id_by_name.get(name)
        if not is_int(artist_id):
            raise RuntimeError(f"missing artist_id for circle={name}")
        artist_ids.append(artist_id)

    tracks_signature: list[tuple[int, str | None, str]] = []
    for track in release["tracks"]:
        thb_song_id = track.get("thb_song_id")
        if not is_int(thb_song_id):
            raise RuntimeError("release has invalid track.thb_song_id")
        song_title = song_title_by_thb_song_id.get(thb_song_id)
        if not isinstance(song_title, str):
            raise RuntimeError(f"missing song title for thb_song_id={thb_song_id}")

        disc_no = track.get("disc_no")
        if not is_int(disc_no) or disc_no <= 0:
            disc_no = 1
        track_no = track.get("track_no")
        track_number = None if track_no is None else str(track_no)
        tracks_signature.append(
            (disc_no - 1, track_number, normalize_lookup_text(song_title))
        )

    return tuple(sorted(artist_ids)), tuple(sorted(tracks_signature))


def release_existing_signature(
    release_entity: dict[str, Any],
) -> tuple[tuple[int, ...], tuple[tuple[int, str | None, int], ...]] | None:
    artists = release_entity.get("artists")
    if not isinstance(artists, list):
        return None
    artist_ids: list[int] = []
    for artist in artists:
        if not isinstance(artist, dict):
            return None
        artist_id = artist.get("id")
        if not is_int(artist_id):
            return None
        artist_ids.append(artist_id)

    discs = release_entity.get("discs")
    if not isinstance(discs, list):
        return None
    disc_index_by_id: dict[int, int] = {}
    for idx, disc in enumerate(discs):
        if not isinstance(disc, dict):
            return None
        disc_id = disc.get("id")
        if not is_int(disc_id):
            return None
        disc_index_by_id[disc_id] = idx

    tracks = release_entity.get("tracks")
    if not isinstance(tracks, list):
        return None
    tracks_signature: list[tuple[int, str | None, int]] = []
    for track in tracks:
        if not isinstance(track, dict):
            return None
        song = track.get("song")
        if not isinstance(song, dict):
            return None
        song_id = song.get("id")
        disc_id = track.get("disc_id")
        if not is_int(song_id) or not is_int(disc_id):
            return None
        disc_index = disc_index_by_id.get(disc_id)
        if disc_index is None:
            return None
        track_no = track.get("track_number")
        track_number = None if track_no is None else str(track_no)
        tracks_signature.append((disc_index, track_number, song_id))

    return tuple(sorted(artist_ids)), tuple(sorted(tracks_signature))


def release_existing_title_signature(
    release_entity: dict[str, Any],
) -> tuple[tuple[int, ...], tuple[tuple[int, str | None, str], ...]] | None:
    artists = release_entity.get("artists")
    if not isinstance(artists, list):
        return None
    artist_ids: list[int] = []
    for artist in artists:
        if not isinstance(artist, dict):
            return None
        artist_id = artist.get("id")
        if not is_int(artist_id):
            return None
        artist_ids.append(artist_id)

    discs = release_entity.get("discs")
    if not isinstance(discs, list):
        return None
    disc_index_by_id: dict[int, int] = {}
    for idx, disc in enumerate(discs):
        if not isinstance(disc, dict):
            return None
        disc_id = disc.get("id")
        if not is_int(disc_id):
            return None
        disc_index_by_id[disc_id] = idx

    tracks = release_entity.get("tracks")
    if not isinstance(tracks, list):
        return None
    tracks_signature: list[tuple[int, str | None, str]] = []
    for track in tracks:
        if not isinstance(track, dict):
            return None
        song = track.get("song")
        if not isinstance(song, dict):
            return None
        song_title = song.get("title")
        disc_id = track.get("disc_id")
        if not isinstance(song_title, str) or not is_int(disc_id):
            return None
        disc_index = disc_index_by_id.get(disc_id)
        if disc_index is None:
            return None
        track_no = track.get("track_number")
        track_number = None if track_no is None else str(track_no)
        tracks_signature.append(
            (disc_index, track_number, normalize_lookup_text(song_title))
        )

    return tuple(sorted(artist_ids)), tuple(sorted(tracks_signature))


async def find_existing_release_id(
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    release: dict[str, Any],
    song_id_by_thb_song_id: dict[int, int],
    song_title_by_thb_song_id: dict[int, str],
    artist_id_by_name: dict[str, int],
) -> int | None:
    title = release["title"]
    response_data = await get_json(
        client, limiter, "/release", params={"keyword": title}
    )
    if not isinstance(response_data, list):
        return None

    target_title = normalize_lookup_text(title)
    expected_signature = release_expected_signature(
        release, song_id_by_thb_song_id, artist_id_by_name
    )
    expected_title_signature = release_expected_title_signature(
        release, song_title_by_thb_song_id, artist_id_by_name
    )

    matched_ids: set[int] = set()
    matched_title_ids: set[int] = set()
    for item in response_data:
        if not isinstance(item, dict):
            continue
        entity_id = item.get("id")
        entity_title = item.get("title")
        if not is_int(entity_id) or not isinstance(entity_title, str):
            continue
        if normalize_lookup_text(entity_title) != target_title:
            continue
        signature = release_existing_signature(item)
        if signature == expected_signature:
            matched_ids.add(entity_id)
            continue
        title_signature = release_existing_title_signature(item)
        if title_signature == expected_title_signature:
            matched_title_ids.add(entity_id)

    if len(matched_ids) > 1:
        raise RuntimeError(
            f"ambiguous release match for thb_album_id={release['thb_album_id']}"
        )
    if len(matched_ids) == 1:
        return next(iter(matched_ids))
    if len(matched_title_ids) == 1:
        return next(iter(matched_title_ids))
    if len(matched_title_ids) > 1:
        return min(matched_title_ids)
    return None


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


def serialize_plan(method: str, url: str, body: dict[str, Any]) -> str:
    return json.dumps(
        {
            "method": method,
            "url": url,
            "body": body,
        },
        ensure_ascii=False,
    )


async def process_artist(
    artist: dict[str, Any],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    api_base: str,
    dry_run: bool,
    auth_header: str,
) -> ImportTaskResult:
    name = artist["name"].strip()
    try:
        existing_id = await find_existing_artist_id(client, limiter, name)
        if is_int(existing_id):
            return ImportTaskResult(
                status="skipped",
                item_key=name,
                entity_id=existing_id,
                stdout_text=f"[info] [artist][skip] circle={name} artist_id={existing_id}",
            )

        if dry_run:
            plan = serialize_plan(
                "POST", f"{api_base}/artist", build_artist_payload(name)
            )
            return ImportTaskResult(
                status="created",
                item_key=name,
                stdout_text=f"[info] [artist][plan] circle={name}\n{plan}",
            )

        response_body = await post_json(
            client, limiter, "/artist", build_artist_payload(name), auth_header
        )
        entity_id = extract_entity_id(response_body)
        if not is_int(entity_id):
            raise RuntimeError(
                f"cannot extract entity_id from /artist response for circle={name}"
            )
        return ImportTaskResult(
            status="created",
            item_key=name,
            entity_id=entity_id,
            stdout_text=f"[info] [artist][created] circle={name} artist_id={entity_id}",
        )
    except Exception as err:
        return ImportTaskResult(
            status="failed",
            item_key=name,
            stderr_text=f"[artist][failed] circle={name} error={err}",
        )


async def process_song(
    song: dict[str, Any],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    api_base: str,
    dry_run: bool,
    auth_header: str,
    expected_release_keys: set[tuple[str, str | None]],
) -> ImportTaskResult:
    thb_song_id = song["thb_song_id"]
    title = song["title"]
    try:
        existing_id = await find_existing_song_id(
            client, limiter, title, expected_release_keys
        )
        if is_int(existing_id):
            return ImportTaskResult(
                status="skipped",
                item_key=thb_song_id,
                entity_id=existing_id,
                stdout_text=(
                    f"[info] [song][skip] thb_song_id={thb_song_id} "
                    f"title={title} song_id={existing_id}"
                ),
            )

        if dry_run:
            plan = serialize_plan("POST", f"{api_base}/song", build_song_payload(song))
            return ImportTaskResult(
                status="created",
                item_key=thb_song_id,
                stdout_text=(
                    f"[info] [song][plan] thb_song_id={thb_song_id} "
                    f"title={title}\n{plan}"
                ),
            )

        response_body = await post_json(
            client, limiter, "/song", build_song_payload(song), auth_header
        )
        entity_id = extract_entity_id(response_body)
        if not is_int(entity_id):
            raise RuntimeError(
                "cannot extract entity_id from /song response "
                f"for thb_song_id={thb_song_id}"
            )
        return ImportTaskResult(
            status="created",
            item_key=thb_song_id,
            entity_id=entity_id,
            stdout_text=(
                f"[info] [song][created] thb_song_id={thb_song_id} "
                f"title={title} song_id={entity_id}"
            ),
        )
    except Exception as err:
        return ImportTaskResult(
            status="failed",
            item_key=thb_song_id,
            stderr_text=(
                f"[song][failed] thb_song_id={thb_song_id} title={title} error={err}"
            ),
        )


async def process_release(
    release: dict[str, Any],
    client: httpx.AsyncClient,
    limiter: AsyncRateLimiter | None,
    api_base: str,
    dry_run: bool,
    auth_header: str,
    song_id_by_thb_song_id: dict[int, int],
    song_title_by_thb_song_id: dict[int, str],
    artist_id_by_name: dict[str, int],
) -> ImportTaskResult:
    thb_album_id = release["thb_album_id"]
    title = release["title"]
    try:
        existing_id = await find_existing_release_id(
            client,
            limiter,
            release,
            song_id_by_thb_song_id,
            song_title_by_thb_song_id,
            artist_id_by_name,
        )
        if is_int(existing_id):
            return ImportTaskResult(
                status="skipped",
                item_key=thb_album_id,
                entity_id=existing_id,
                stdout_text=(
                    f"[info] [release][skip] thb_album_id={thb_album_id} "
                    f"title={title} release_id={existing_id}"
                ),
            )

        if dry_run:
            plan = serialize_plan(
                "POST",
                f"{api_base}/release",
                build_release_payload_plan(
                    release, song_id_by_thb_song_id, artist_id_by_name
                ),
            )
            return ImportTaskResult(
                status="created",
                item_key=thb_album_id,
                stdout_text=(
                    f"[info] [release][plan] thb_album_id={thb_album_id} "
                    f"title={title}\n{plan}"
                ),
            )

        response_body = await post_json(
            client,
            limiter,
            "/release",
            build_release_payload(release, song_id_by_thb_song_id, artist_id_by_name),
            auth_header,
        )
        entity_id = extract_entity_id(response_body)
        if not is_int(entity_id):
            raise RuntimeError(
                "cannot extract entity_id from /release response "
                f"for thb_album_id={thb_album_id}"
            )
        return ImportTaskResult(
            status="created",
            item_key=thb_album_id,
            entity_id=entity_id,
            stdout_text=(
                f"[info] [release][created] thb_album_id={thb_album_id} "
                f"title={title} release_id={entity_id}"
            ),
        )
    except Exception as err:
        return ImportTaskResult(
            status="failed",
            item_key=thb_album_id,
            stderr_text=(
                f"[release][failed] thb_album_id={thb_album_id} title={title} error={err}"
            ),
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


async def async_main(argv: list[str]) -> int:
    options = parse_args(argv)
    seed = read_json(DEFAULT_SEED)
    validate_seed(seed)
    song_title_by_thb_song_id = build_song_title_by_thb_song_id(seed)

    env_from_file = parse_env_file(DEFAULT_ENV)
    server_port = os.getenv("SERVER_PORT") or env_from_file.get("SERVER_PORT")
    if server_port and not options.api_base_explicit:
        options.api_base = apply_server_port(options.api_base, server_port)
    admin_user = options.admin_user or env_from_file.get("ADMIN_USERNAME") or "Admin"
    admin_pass = options.admin_pass or env_from_file.get("ADMIN_PASSWORD")
    rate_limit_config = build_import_rate_limit_config(
        options.import_token,
        env_from_file,
        options.req_per_sec,
        options.req_per_sec_explicit,
        AsyncRateLimiter,
    )

    dry_run = not options.run_mode
    if not dry_run and not admin_pass:
        raise RuntimeError(
            "ADMIN_PASSWORD not found. Set it in .env or pass --admin-pass"
        )

    auth_header = ""
    if not dry_run:
        auth_header = (
            f"Basic {base64.b64encode(f'{admin_user}:{admin_pass}'.encode()).decode()}"
        )

    artist_id_by_name: dict[str, int] = {}
    song_id_by_thb_song_id: dict[int, int] = {}
    song_expected_release_keys = build_song_expected_release_keys(seed)

    log_info(
        "start "
        f"mode={'dry-run' if dry_run else 'run'} "
        f"api_base={options.api_base} "
        f"seed={DEFAULT_SEED} "
        f"concurrency={options.concurrency} "
        f"req_per_sec={rate_limit_config.req_per_sec_label} "
        f"rate_limit_token={rate_limit_config.enabled_label}"
    )

    limiter = rate_limit_config.limiter
    limits = httpx.Limits(
        max_connections=options.concurrency,
        max_keepalive_connections=options.concurrency,
    )

    async with httpx.AsyncClient(
        base_url=options.api_base,
        timeout=REQUEST_TIMEOUT_SECONDS,
        limits=limits,
        headers=rate_limit_config.headers,
    ) as client:
        artist_results = await run_stage(
            seed["artists"],
            options.concurrency,
            lambda artist: process_artist(
                artist, client, limiter, options.api_base, dry_run, auth_header
            ),
            lambda artist: normalize_lookup_text(artist["name"]),
        )
        artist_created, artist_skipped, artist_failed = count_results(artist_results)
        for result in artist_results:
            if is_int(result.entity_id) and isinstance(result.item_key, str):
                artist_id_by_name[result.item_key] = result.entity_id

        song_results = await run_stage(
            seed["songs"],
            options.concurrency,
            lambda song: process_song(
                song,
                client,
                limiter,
                options.api_base,
                dry_run,
                auth_header,
                song_expected_release_keys.get(song["thb_song_id"], set()),
            ),
            lambda song: normalize_lookup_text(song["title"]),
        )
        song_created, song_skipped, song_failed = count_results(song_results)
        for result in song_results:
            if is_int(result.entity_id) and is_int(result.item_key):
                song_id_by_thb_song_id[result.item_key] = result.entity_id

        release_results = await run_stage(
            seed["releases"],
            options.concurrency,
            lambda release: process_release(
                release,
                client,
                limiter,
                options.api_base,
                dry_run,
                auth_header,
                song_id_by_thb_song_id,
                song_title_by_thb_song_id,
                artist_id_by_name,
            ),
            lambda release: normalize_lookup_text(release["title"]),
        )
        release_created, release_skipped, release_failed = count_results(
            release_results
        )

    if dry_run:
        print(
            f"artists create={artist_created} skip={artist_skipped} failed={artist_failed}",
        )
        print(
            f"songs total={len(seed['songs'])} create={song_created} skip={song_skipped} failed={song_failed}",
        )
        print(
            f"releases total={len(seed['releases'])} create={release_created} skip={release_skipped} failed={release_failed}",
        )
        print(f"seed: {DEFAULT_SEED}")
        return 0

    print(
        f"artists created={artist_created} skipped={artist_skipped} failed={artist_failed}"
    )
    print(f"songs created={song_created} skipped={song_skipped} failed={song_failed}")
    print(
        f"releases created={release_created} skipped={release_skipped} failed={release_failed}"
    )

    if song_failed > 0 or release_failed > 0:
        return 1
    return 0


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
