import { getResponseTraceId, UserApi } from "@thc/api"
import { Either } from "effect"
import type { render } from "solid-js/web"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { resetPassword } from "~/hey-api/sdk.gen"
import { requestResetPassword } from "~/view/auth/reset_password/request"
import { resetPasswordByKey } from "~/view/auth/reset_password/reset_password_by_key"
import { createResetPasswordUiStore } from "~/view/auth/reset_password/store"

vi.mock(import("solid-js/web"), () => ({
	render: vi.fn<typeof render>(),
}))
vi.mock(import("../App"), () => ({ default: () => null }))
vi.mock(import("../state/i18n/init"), () => ({
	resolveInitialLocale: () => "en",
}))
vi.mock(import("../state/i18n/runtime"), () => ({
	loadLocale: () => Promise.resolve(),
}))

describe("http response trace IDs", () => {
	beforeAll(async () => {
		vi.stubGlobal("HTMLElement", Object)
		vi.stubGlobal("document", { querySelector: () => ({}) })
		await import("../index")
	})
	afterEach(vi.unstubAllGlobals)

	it("preserves a rate limit message through the reset password flow", async () => {
		expect.assertions(1)
		const limitedResponse = new Response("Too many requests", {
				status: 429,
				headers: { "X-Trace-Id": "rate-limit-trace" },
			}),
			options = {
				baseUrl: "http://localhost/api",
				fetch: vi.fn<typeof fetch>().mockResolvedValue(limitedResponse),
			},
			uiStore = createResetPasswordUiStore()

		await resetPasswordByKey({
			password: "password",
			resetPasswordByKey: (body) =>
				requestResetPassword(body, { ...options, body }),
			onSuccess: vi.fn<() => Promise<void>>(),
			uiStore,
			requestFailedMessage: "Request failed",
			invalidOrExpiredResetKeyMessage: "Invalid key",
		})
		expect(uiStore.state.resetPasswordError).toBe("Too many requests")
	})

	it("keeps each thrown server error associated with its own response trace ID", async () => {
		expect.assertions(4)
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValueOnce(
				Response.json(
					{ status: "Err", message: "First failure" },
					{ status: 500, headers: { "X-Trace-Id": "first-trace" } },
				),
			)
			.mockResolvedValueOnce(
				Response.json(
					{ status: "Err", message: "Second failure" },
					{ status: 500, headers: { "X-Trace-Id": "second-trace" } },
				),
			)
		const options = {
			body: { password: "password" },
			baseUrl: "http://localhost/api",
			fetch,
			throwOnError: true as const,
		}
		const firstError = await resetPassword(options).catch(
			(caught: unknown) => caught,
		)
		const secondError = await resetPassword(options).catch(
			(caught: unknown) => caught,
		)

		expect(firstError).toStrictEqual({
			status: "Err",
			message: "First failure",
		})
		expect(secondError).toStrictEqual({
			status: "Err",
			message: "Second failure",
		})
		expect(getResponseTraceId(firstError)).toBe("first-trace")
		expect(getResponseTraceId(secondError)).toBe("second-trace")
	})

	it("retains the trace ID on an API adapter failure", async () => {
		expect.assertions(2)
		vi.stubGlobal("fetch", () =>
			Promise.resolve(
				new Response("Too many requests", {
					status: 429,
					headers: { "X-Trace-Id": "adapter-trace" },
				}),
			),
		)
		const result = await UserApi.updateBio("bio")

		if (Either.isRight(result)) throw new Error("Expected an API error")
		expect(result.left.error).toBe("Too many requests")
		expect(getResponseTraceId(result.left)).toBe("adapter-trace")
	})
})
