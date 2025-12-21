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

export type ApiError<E> =
	| {
			type: "Server"
			error: E
	  }
	| {
			type: "Response"
			error: string
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

function serverError<E>(error: E) {
	return {
		type: "Server",
		error,
	} as const
}

function responseError<E>(error: E) {
	return {
		type: "Response",
		error,
	} as const
}

function handleError<E>(res: RestErrorResponse<E>) {
	if (res.error) {
		return serverError(res.error)
	} else {
		return responseError(res.response.statusText)
	}
}

function handleErrorResult<E extends ErrResponse | undefined>(
	res: RestErrorResponse<E>,
) {
	if (res.error) {
		return E.left({
			type: "Server",
			error: res.error.message,
		} as const)
	} else {
		return E.left({
			type: "Response",
			error: res.response.statusText,
		} as const)
	}
}

type FetchResponse<T, E> = ADTEnum<
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

export function adaptApi<T, E>(res: FetchResponse<T, E>) {
	if (res.data) {
		return res.data
	} else {
		return handleError(res)
	}
}

export function adaptApiResult<T, E extends ErrResponse | undefined>(
	res: FetchResponse<T, E>,
) {
	return E.gen(function* () {
		if (!res.data) {
			yield* handleErrorResult(res)
		}

		return res.data!.data
	})
}

export function adaptApiResultOptional<T, E extends ErrResponse | undefined>(
	res: FetchResponse<T, E>,
) {
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

export function adaptApiResultMessage<E extends ErrResponse | undefined>(
	res: FetchMessageResponse<E>,
) {
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
	AreAllKeysOptional<T> extends true
		? { [key in Key]?: T }
		: { [key in Key]: T }
