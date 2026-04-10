import { ObjExt } from "@thc/toolkit/data"
import { Either as E } from "effect"

import type {
	HandleImageQueueMethod,
	ImageQueueDetail,
	ImageQueueStatus,
	ImageQueueType,
} from "../../gen"
import type { ApiError } from "../../shared"
import type {
	CursorPage,
	PendingImageQueueItem,
	UserImageQueueItem,
} from "../../type"

type ApiResult<T> = E.Either<T, ApiError<string>>

const ORIGIN = globalThis.location.origin

function buildUrl(
	path: string,
	query?: Record<string, string | number | null | undefined>,
): string {
	const url = new globalThis.URL(`/api${path}`, ORIGIN)

	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value === undefined || value === null) continue
			url.searchParams.set(key, String(value))
		}
	}

	return url.toString()
}

async function requestJson(input: RequestInfo, init?: RequestInit) {
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

function isOkDataResponse<T>(json: unknown): json is OkDataResponse<T> {
	return ObjExt.isRecord(json) && json["status"] === "Ok" && "data" in json
}

function isOkMessageResponse(json: unknown): json is OkMessageResponse {
	return (
		ObjExt.isRecord(json)
		&& json["status"] === "Ok"
		&& typeof json["message"] === "string"
	)
}

function isErrMessageResponse(json: unknown): json is ErrMessageResponse {
	return (
		ObjExt.isRecord(json)
		&& json["status"] === "Err"
		&& typeof json["message"] === "string"
	)
}

function expectMessage(json: unknown): string | undefined {
	if (!isOkMessageResponse(json)) {
		return undefined
	}

	return json.message
}

function extractServerError(json: unknown): string | undefined {
	if (!isErrMessageResponse(json)) {
		return undefined
	}

	return json.message
}

async function getData<T>(
	path: string,
	query?: Record<string, string | number | null | undefined>,
): Promise<ApiResult<T>> {
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

async function postMessage(
	path: string,
	query?: Record<string, string | number | null | undefined>,
): Promise<ApiResult<string>> {
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
	query?: {
		cursor?: number
		limit?: number
		type?: ImageQueueType
		status?: ImageQueueStatus
	}
}): Promise<ApiResult<CursorPage<PendingImageQueueItem>>> {
	const result = await getData<CursorPage<PendingImageQueueItem>>(
		"/image-queue",
		options.query,
	)
	return result
}

export async function pendingCount(): Promise<ApiResult<number>> {
	const result = await getData<number>("/image-queue/pending-count")
	return result
}

export async function detail(options: {
	path: {
		id: number
	}
}): Promise<ApiResult<ImageQueueDetail>> {
	const result = await getData<ImageQueueDetail>(
		`/image-queue/${options.path.id}`,
	)
	return result
}

export async function handle(options: {
	path: {
		id: number
	}
	query: {
		method: HandleImageQueueMethod
	}
}): Promise<ApiResult<string>> {
	const result = await postMessage(
		`/image-queue/${options.path.id}`,
		options.query,
	)
	return result
}

export async function userQueue(options: {
	path: {
		id: number
	}
	query?: {
		cursor?: number
		limit?: number
	}
}): Promise<ApiResult<CursorPage<UserImageQueueItem>>> {
	const result = await getData<CursorPage<UserImageQueueItem>>(
		`/user/${options.path.id}/image-queue`,
		options.query,
	)
	return result
}
