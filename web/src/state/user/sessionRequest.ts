import { queryOptions } from "@tanstack/solid-query"
import type { UserProfile } from "@thc/api"

import { profile as getProfile } from "~/hey-api"
import { SESSION_QUERY_KEY } from "~/state/tanstack"

const USER_REFRESH_RETRY_MIN_MS = 1_000
const USER_REFRESH_RETRY_MAX_MS = 30_000
const SESSION_REFRESH_RETRY_LIMIT = 3
const AUTHORIZATION_REFRESH_RETRY_LIMIT = 5

type SessionRequestFailureReason =
	| { kind: "request" }
	| { kind: "response"; responseStatus: number }

class SessionRequestError extends Error {
	readonly name = "SessionRequestError"
	readonly reason: SessionRequestFailureReason

	constructor(reason: SessionRequestFailureReason) {
		super(
			reason.kind === "request"
				? "Failed to request the current user"
				: `Current user request failed with status ${reason.responseStatus}`,
		)
		this.reason = reason
	}
}

export async function requestCurrentUser(signal?: AbortSignal) {
	let response: Awaited<ReturnType<typeof getProfile>>
	try {
		response = await getProfile({ signal })
	} catch {
		throw new SessionRequestError({ kind: "request" })
	}

	if (response.error === undefined) return response.data.data
	if (response.response?.status === 401) return null

	if (response.response === undefined) {
		throw new SessionRequestError({ kind: "request" })
	}

	throw new SessionRequestError({
		kind: "response",
		responseStatus: response.response.status,
	})
}

function shouldRetrySessionRequest(failure: SessionRequestError) {
	if (failure.reason.kind === "request") return true

	const status = failure.reason.responseStatus
	return status === 408 || status === 429 || (status >= 500 && status < 600)
}

function sessionRetryDelay(failureCount: number) {
	return Math.min(
		USER_REFRESH_RETRY_MIN_MS * 2 ** failureCount,
		USER_REFRESH_RETRY_MAX_MS,
	)
}

export const SESSION_QUERY = queryOptions<
	UserProfile | null,
	SessionRequestError
>({
	queryKey: [...SESSION_QUERY_KEY, "current-user"],
	queryFn: ({ signal }) => requestCurrentUser(signal),
	retry: (failureCount, failure) =>
		failureCount < SESSION_REFRESH_RETRY_LIMIT
		&& shouldRetrySessionRequest(failure),
	retryDelay: sessionRetryDelay,
	staleTime: 0,
	gcTime: 0,
})

export const AUTHORIZATION_QUERY = queryOptions<
	UserProfile | null,
	SessionRequestError
>({
	...SESSION_QUERY,
	queryKey: [...SESSION_QUERY_KEY, "authorization"],
	retry: (failureCount, failure) =>
		failureCount < AUTHORIZATION_REFRESH_RETRY_LIMIT
		&& shouldRetrySessionRequest(failure),
	retryDelay: (failureCount) =>
		Math.floor(Math.random() * sessionRetryDelay(failureCount)),
})
