import { cleanup, render } from "@solidjs/testing-library"
import { useQuery } from "@tanstack/solid-query"
import { afterEach, describe, expect, it } from "vitest"

import { SESSION_QUERY } from "~/state/user/sessionRequest"

import {
	QUERY_CLIENT,
	resetAuthorizationQueries,
	resetSessionQueries,
	TanStackProvider,
} from "."

const CONTENT_QUERY_KEY = ["content"] as const

describe("query resets", () => {
	afterEach(() => {
		cleanup()
		QUERY_CLIENT.clear()
	})

	it("clears cached data before reloading active queries after a session change", async () => {
		expect.hasAssertions()
		let requestCount = 0
		const refreshedContent = Promise.withResolvers<number>()

		function ContentQuery() {
			const query = useQuery(() => ({
				queryKey: CONTENT_QUERY_KEY,
				queryFn: () => {
					requestCount += 1
					if (requestCount === 1) return Promise.resolve(requestCount)

					return refreshedContent.promise
				},
			}))

			return <div>{query.data ?? "loading"}</div>
		}

		const view = render(() => (
			<TanStackProvider>
				<ContentQuery />
			</TanStackProvider>
		))

		await expect.element(view.container).toHaveTextContent("1")
		const sessionReset = resetSessionQueries()
		await expect.element(view.container).toHaveTextContent("loading")

		refreshedContent.resolve(2)
		await sessionReset
		await expect.element(view.container).toHaveTextContent("2")
	})

	it("keeps the current session while resetting authorization-dependent data", async () => {
		expect.hasAssertions()
		let sessionRequests = 0
		let contentRequests = 0
		const refreshedContent = Promise.withResolvers<number>()

		function AuthorizationQueries() {
			const session = useQuery(() => ({
				queryKey: SESSION_QUERY.queryKey,
				queryFn: () => {
					sessionRequests += 1
					return Promise.resolve(sessionRequests)
				},
			}))
			const content = useQuery(() => ({
				queryKey: CONTENT_QUERY_KEY,
				queryFn: () => {
					contentRequests += 1
					if (contentRequests === 1) return Promise.resolve(contentRequests)

					return refreshedContent.promise
				},
			}))

			return (
				<div>{`session:${session.data ?? "loading"};content:${content.data ?? "loading"}`}</div>
			)
		}

		const view = render(() => (
			<TanStackProvider>
				<AuthorizationQueries />
			</TanStackProvider>
		))

		await expect
			.element(view.container)
			.toHaveTextContent("session:1;content:1")
		const authorizationReset = resetAuthorizationQueries()
		await expect
			.element(view.container)
			.toHaveTextContent("session:1;content:loading")

		refreshedContent.resolve(2)
		await authorizationReset
		await expect
			.element(view.container)
			.toHaveTextContent("session:1;content:2")
	})
})
