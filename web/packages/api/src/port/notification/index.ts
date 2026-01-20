import { Either as E } from "effect"

import type { ApiError } from "../../shared"
import type { NotificationItem, Paginated } from "../../type"

// TODO: Refactor adapter
type ApiResult<T> = E.Either<T, ApiError<string>>

const ORIGIN = globalThis.location?.origin ?? "http://localhost:3000"

const buildUrl = (
	path: string,
	query?: Record<string, string | number | null | undefined>,
) => {
	const url = new globalThis.URL(`/api${path}`, ORIGIN)

	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value === undefined || value === null) continue
			url.searchParams.set(key, String(value))
		}
	}

	return url.toString()
}

const requestJson = async (input: RequestInfo, init?: RequestInit) => {
	try {
		const res = await globalThis.fetch(input, init)
		const json = await res.json().catch(() => null)

		return { res, json }
	} catch (e) {
		return {
			res: undefined,
			json: undefined,
			error: e instanceof Error ? e.message : "Unknown network error",
		}
	}
}

const expectData = <T>(json: unknown): T | undefined => {
	if (typeof json !== "object" || json === null) return undefined
	if (Reflect.get(json, "status") !== "Ok") return undefined
	if (!Reflect.has(json, "data")) return undefined
	return Reflect.get(json, "data")
}

const expectMessage = (json: unknown): string | undefined => {
	if (typeof json !== "object" || json === null) return undefined
	if (Reflect.get(json, "status") !== "Ok") return undefined
	if (!Reflect.has(json, "message")) return undefined
	const message = Reflect.get(json, "message")
	return typeof message === "string" ? message : undefined
}

const extractServerError = (json: unknown): string | undefined => {
	if (typeof json !== "object" || json === null) return undefined
	if (Reflect.get(json, "status") !== "Err") return undefined
	if (!Reflect.has(json, "message")) return undefined
	const message = Reflect.get(json, "message")
	return typeof message === "string" ? message : undefined
}

const getData = async <T>(
	path: string,
	query?: Record<string, string | number | null | undefined>,
): Promise<ApiResult<T>> => {
	const { res, json, error } = await requestJson(buildUrl(path, query), {
		method: "GET",
		credentials: "include",
	})

	if (!res) {
		return E.left({ type: "Response", error: error ?? "Request failed" })
	}

	if (!res.ok) {
		return E.left({
			type: "Server",
			error: extractServerError(json) ?? res.statusText,
		})
	}

	const data = expectData<T>(json)
	if (data === undefined) {
		return E.left({ type: "Response", error: "Invalid response shape" })
	}

	return E.right(data)
}

const postMessage = async (
	path: string,
	query?: Record<string, string | number | null | undefined>,
): Promise<ApiResult<string>> => {
	const { res, json, error } = await requestJson(buildUrl(path, query), {
		method: "POST",
		credentials: "include",
	})

	if (!res) {
		return E.left({ type: "Response", error: error ?? "Request failed" })
	}

	if (!res.ok) {
		return E.left({
			type: "Server",
			error: extractServerError(json) ?? res.statusText,
		})
	}

	const message = expectMessage(json)
	if (message === undefined) {
		return E.left({ type: "Response", error: "Invalid response shape" })
	}

	return E.right(message)
}

export async function list(options: {
	query?: { cursor?: number; limit?: number }
}): Promise<ApiResult<Paginated<NotificationItem>>> {
	return await getData("/notifications", options.query)
}

export async function unreadCount(): Promise<ApiResult<number>> {
	return await getData("/notifications/unread-count")
}

export async function markRead(options: {
	path: { id: number }
}): Promise<ApiResult<string>> {
	return await postMessage(`/notifications/${options.path.id}/read`)
}

export async function readAll(): Promise<ApiResult<string>> {
	return await postMessage("/notifications/read-all")
}
