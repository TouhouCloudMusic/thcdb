import { ObjExt } from "@thc/toolkit/data"
import { Either as E } from "effect"

import type { ApiError } from "../../shared"
import type { CursorPage, NotificationItem } from "../../type"

// TODO: Refactor adapter
type ApiResult<T> = E.Either<T, ApiError<string>>

const ORIGIN = globalThis.location.origin

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
		const json: unknown = await res.json().catch(() => null)

		return { res, json }
	} catch (e) {
		return {
			res: undefined,
			json: undefined,
			error: e instanceof Error ? e.message : "Unknown network error",
		}
	}
}

type OkDataResponse<T> = {
	status: "Ok"
	data: T
}

type OkMessageResponse = {
	status: "Ok"
	message: string
}

type ErrMessageResponse = {
	status: "Err"
	message: string
}

const isOkDataResponse = <T>(json: unknown): json is OkDataResponse<T> => {
	return ObjExt.isRecord(json) && json["status"] === "Ok" && "data" in json
}

const isOkMessageResponse = (json: unknown): json is OkMessageResponse => {
	return (
		ObjExt.isRecord(json)
		&& json["status"] === "Ok"
		&& typeof json["message"] === "string"
	)
}

const isErrMessageResponse = (json: unknown): json is ErrMessageResponse => {
	return (
		ObjExt.isRecord(json)
		&& json["status"] === "Err"
		&& typeof json["message"] === "string"
	)
}

const expectMessage = (json: unknown): string | undefined => {
	if (!isOkMessageResponse(json)) return undefined
	return json.message
}

const extractServerError = (json: unknown): string | undefined => {
	if (!isErrMessageResponse(json)) return undefined
	return json.message
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
		return E.left({ type: "Response", error })
	}

	if (!res.ok) {
		return E.left({
			type: "Server",
			error: extractServerError(json) ?? res.statusText,
		})
	}

	if (!isOkDataResponse<T>(json)) {
		return E.left({ type: "Response", error: "Invalid response shape" })
	}

	return E.right(json.data)
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
		return E.left({ type: "Response", error })
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
}): Promise<ApiResult<CursorPage<NotificationItem>>> {
	const result = await getData<CursorPage<NotificationItem>>(
		"/notifications",
		options.query,
	)
	return result
}

export async function unreadCount(): Promise<ApiResult<number>> {
	const result = await getData<number>("/notifications/unread-count")
	return result
}

export async function markRead(options: {
	path: { id: number }
}): Promise<ApiResult<string>> {
	const result = await postMessage(`/notifications/${options.path.id}/read`)
	return result
}

export async function readAll(): Promise<ApiResult<string>> {
	const result = await postMessage("/notifications/read-all")
	return result
}
