import type { ADTEnum } from "@thc/toolkit/types"
import { Either as E, Option as O } from "effect"

import type { operations } from "../gen"

export type OkResponse<T> = {
	status: string
	data: T
}

export type MessageResponse = {
	status: "Ok"
	message: string
}

export type ErrResponse = {
	status: "Err"
	message: string
}

type RawResponse = {
	request: Request
	response: Response
}

export type ApiResponse<T> = OkResponse<T> | MessageResponse | ErrResponse
export type ApiResponseNonExhaustive<T> = ApiResponse<T> & RawResponse

export type ApiError<_E = unknown> =
	| {
			type: "Server"
			error: string
			statusCode?: number
			detail?: _E
	  }
	| {
			type: "Response"
			error: string
			statusCode?: number
	  }

export type ApiResult<T, E = ErrResponse> = E.Either<T, ApiError<E>>
export type ApiResultOptional<T, E = ErrResponse> = E.Either<
	O.Option<NonNullable<T>>,
	ApiError<E>
>

type RestErrorResponse<E> = {
	error?: E
	response: Response
}

function extractErrorMessage(error: unknown): string {
	if (typeof error === "string") return error
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = error.message
		if (typeof message === "string") return message
	}

	return "Unknown server error"
}

function handleError<E>(res: RestErrorResponse<E>) {
	if (res.error) {
		return {
			type: "Server",
			error: extractErrorMessage(res.error),
			statusCode: res.response.status,
			detail: res.error,
		} as const
	} else {
		return {
			type: "Response",
			error: res.response.statusText,
			statusCode: res.response.status,
		} as const
	}
}

function handleErrorResult<E>(res: RestErrorResponse<E>) {
	if (res.error) {
		return E.left({
			type: "Server",
			error: extractErrorMessage(res.error),
			statusCode: res.response.status,
			detail: res.error,
		} as const)
	} else {
		return E.left({
			type: "Response",
			error: res.response.statusText,
			statusCode: res.response.status,
		} as const)
	}
}

export type FetchResponse<T, E> = ADTEnum<
	[
		{
			data: OkResponse<T>
		},
		{
			error: E
		},
	]
> & {
	response: Response
}

export function isErrResponse(data: unknown): data is ErrResponse {
	if (!data || typeof data !== "object") return false
	const d = data as { status?: unknown; message?: unknown }
	return d.status === "Err" && typeof d.message === "string"
}

function isOkResponse<T>(data: unknown): data is OkResponse<T> {
	if (!data || typeof data !== "object") return false
	const d = data as { status?: unknown; data?: unknown }
	return d.status === "Ok" && Object.hasOwn(data, "data")
}

function toErrResponse(message: string): ErrResponse {
	return {
		status: "Err",
		message,
	}
}

export async function adaptFetchResponseFromResponse<T>(
	response: Response,
): Promise<FetchResponse<T, ErrResponse>> {
	const text = await response.text()

	if (text == "") {
		return { error: toErrResponse(response.statusText), response }
	}

	try {
		const json: unknown = JSON.parse(text)

		if (isErrResponse(json)) {
			return { error: json, response }
		}

		if (isOkResponse<T>(json)) {
			return { data: json, response }
		}

		return { error: toErrResponse("Unexpected JSON response"), response }
	} catch {
		return { error: toErrResponse(text), response }
	}
}

export async function adaptFetchMessageResponseFromResponse(
	response: Response,
): Promise<FetchMessageResponse<ErrResponse>> {
	const text = await response.text()

	if (text == "") {
		return { error: toErrResponse(response.statusText), response }
	}

	try {
		const json: unknown = JSON.parse(text)

		if (isErrResponse(json)) {
			return { error: json, response }
		}

		if (typeof json === "object" && json !== null && "message" in json) {
			const message = json.message
			if (typeof message === "string") {
				return { data: { message }, response }
			}
		}

		return { error: toErrResponse("Unexpected JSON response"), response }
	} catch {
		return { error: toErrResponse(text), response }
	}
}

export function adaptApi<T, E>(res: FetchResponse<T, E>) {
	return res.data ?? handleError(res)
}

export function adaptApiResult<T, E>(res: FetchResponse<T, E>) {
	return E.gen(function* () {
		if (!res.data) {
			yield* handleErrorResult(res)
		}

		return res.data!.data
	})
}

export function adaptApiResultOptional<T, E>(res: FetchResponse<T, E>) {
	return E.gen(function* () {
		if (!res.data) {
			yield* handleErrorResult(res)
		}

		return O.fromNullable(res.data!.data)
	})
}

type FetchMessageResponse<E> = ADTEnum<
	[
		{
			data: {
				message: string
			}
		},
		{
			error: E
		},
	]
> & {
	response: Response
}

export function adaptApiResultMessage<E>(res: FetchMessageResponse<E>) {
	return E.gen(function* () {
		if (!res.data) {
			yield* handleErrorResult(res)
		}

		return res.data!.message
	})
}

export type Query<K extends keyof operations> =
	operations[K]["parameters"]["query"]
export type Path<K extends keyof operations> =
	operations[K]["parameters"]["path"]
export type Body<K extends keyof operations> =
	operations[K]["requestBody"] extends infer R
		? R extends NonNullable<operations[K]["requestBody"]>
			? R["content"][keyof R["content"]] extends infer C
				? C extends Record<string, unknown>
					? C
					: never
				: never
			: never
		: never

// oxlint-disable-next-line no-empty-object-type ban-types
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false

type AreAllKeysOptional<T> =
	// Empty object
	keyof T extends never
		? true
		: IsOptional<T, keyof T> extends true
			? true
			: false

export type Opt<K extends keyof operations> = MakeOpt<"query", Query<K>>
	& MakeOpt<"path", Path<K>>
	& MakeOpt<"body", Body<K>>

type MakeOpt<
	Key extends string,
	T extends Record<string, unknown> | undefined,
> =
	AreAllKeysOptional<T> extends true ? Partial<Record<Key, T>> : Record<Key, T>
