import { cleanup, renderHook, waitFor } from "@solidjs/testing-library"
import type { UserProfile } from "@thc/api"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QUERY_CLIENT } from "~/state/tanstack"

import { UserContextProvider, createUserStore, useCurrentUser } from "."
import { broadcastSessionChange } from "./browserSession"

function userProfile(
	id: number,
	name: string,
	permissions: UserProfile["permissions"] = [],
	roles: UserProfile["roles"] = [],
): UserProfile {
	return {
		id,
		name,
		last_login: "2026-07-13T00:00:00Z",
		permissions,
		roles,
		stats: {
			edit_count: 0,
			vote_count: 0,
		},
	}
}

function loadedProfile(profile: UserProfile) {
	return Response.json({ status: "Ok", data: profile })
}

function failedProfile(status: number, message: string) {
	return Response.json({ status: "Err", message }, { status })
}

function requestPath(input: Parameters<typeof fetch>[0]) {
	const url = input instanceof Request ? input.url : input.toString()
	return new URL(url, globalThis.location.href).pathname
}

function controlledProfileRequest() {
	const result = Promise.withResolvers<ReturnType<typeof loadedProfile>>()
	const started = Promise.withResolvers()

	return {
		started: started.promise,
		resolve: result.resolve,
		respond: () => {
			started.resolve(undefined)
			return result.promise
		},
	}
}

function dispatchSessionEventFromAnotherTab() {
	const key = globalThis.localStorage.key(0)
	globalThis.dispatchEvent(
		new StorageEvent("storage", {
			key,
			newValue: key ? globalThis.localStorage.getItem(key) : null,
			storageArea: globalThis.localStorage,
		}),
	)
}

describe("user session lifecycle", () => {
	beforeEach(() => {
		vi.stubGlobal("navigator", {
			locks: {
				request: vi.fn<
					(name: string, operation: () => unknown) => Promise<unknown>
				>((_name: string, operation: () => unknown) =>
					Promise.resolve(operation()),
				),
			},
		})
	})

	afterEach(() => {
		cleanup()
		QUERY_CLIENT.clear()
		globalThis.localStorage.clear()
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it("loads the current user on startup", async () => {
		expect.hasAssertions()

		globalThis.localStorage.clear()
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			loadedProfile(userProfile(1, "reimu")),
		)
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})

		await waitFor(() => {
			expect({
				status: currentUser.session.status,
				userName: currentUser.profile?.name,
			}).toStrictEqual({
				status: "authenticated",
				userName: "reimu",
			})
		})
	})

	it("signing out in another tab ends the current session", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(failedProfile(401, "Unauthorized"))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.session.status).toBe("authenticated")
		})

		broadcastSessionChange()
		dispatchSessionEventFromAnotherTab()

		await waitFor(() => {
			expect(currentUser.session.status).toBe("anonymous")
		})
	})

	it("rechecks the server after another tab changes the session", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(loadedProfile(userProfile(2, "marisa")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("reimu")
		})

		broadcastSessionChange()
		dispatchSessionEventFromAnotherTab()

		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("marisa")
		})
	})

	it("unrelated tab data does not reload the current user", async () => {
		expect.hasAssertions()

		const requests = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(loadedProfile(userProfile(1, "reimu")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.session.status).toBe("authenticated")
		})

		globalThis.dispatchEvent(
			new StorageEvent("storage", {
				key: "unrelated",
				newValue: "changed",
			}),
		)

		expect({
			requests: requests.mock.calls.length,
			status: currentUser.session.status,
		}).toStrictEqual({ requests: 1, status: "authenticated" })
	})

	it("changes scoped to one tab do not reload the current user", async () => {
		expect.hasAssertions()

		const requests = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(loadedProfile(userProfile(1, "reimu")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.session.status).toBe("authenticated")
		})

		globalThis.dispatchEvent(
			new StorageEvent("storage", {
				key: "auth_session_revision",
				newValue: globalThis.crypto.randomUUID(),
				storageArea: globalThis.sessionStorage,
			}),
		)

		expect({
			requests: requests.mock.calls.length,
			status: currentUser.session.status,
		}).toStrictEqual({ requests: 1, status: "authenticated" })
	})

	it("malformed cross-tab session changes do not reload the current user", async () => {
		expect.hasAssertions()

		const requests = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(loadedProfile(userProfile(1, "reimu")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.session.status).toBe("authenticated")
		})

		broadcastSessionChange()
		const key = globalThis.localStorage.key(0)
		if (key === null) throw new Error("Missing browser session event")
		globalThis.localStorage.setItem(key, "invalid")
		dispatchSessionEventFromAnotherTab()

		expect({
			requests: requests.mock.calls.length,
			status: currentUser.session.status,
		}).toStrictEqual({ requests: 1, status: "authenticated" })
	})

	it("losing authentication ends the current session", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(failedProfile(401, "Unauthorized"))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.session.status).toBe("authenticated")
		})

		await currentUser.refreshSession()
		expect(currentUser.session.status).toBe("anonymous")
	})

	it("an update from an ended session does not affect the current user", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(loadedProfile(userProfile(2, "marisa")))
		const store = createUserStore()
		await store.refreshSession()
		const updateBio = store.bindCurrentSession((bio: string) => {
			store.updateProfile((profile) => ({ ...profile, bio }))
		})

		updateBio("updated")
		expect(store.profile?.bio).toBe("updated")

		await expect(store.run(() => "completed")).resolves.toBe("completed")
		updateBio("stale")

		expect(store.profile?.name).toBe("marisa")
		expect(store.profile?.bio).toBeUndefined()
	})

	it("a failed authentication action preserves the signed-in user", async () => {
		expect.hasAssertions()

		const failure = new Error("Sign-in failed")
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			loadedProfile(userProfile(1, "reimu")),
		)
		const store = createUserStore()
		await store.refreshSession()

		await expect(
			store.run(() => {
				throw failure
			}),
		).rejects.toBe(failure)

		expect(store.profile?.name).toBe("reimu")
	})

	it("refreshes the profile without changing authorization", async () => {
		expect.hasAssertions()

		const user = userProfile(
			1,
			"reimu",
			["image.queue.manage"],
			[{ id: 2, name: "Moderator" }],
		)
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(user))
			.mockResolvedValueOnce(
				loadedProfile({
					...userProfile(
						1,
						"hakurei",
						["comment.manage"],
						[{ id: 3, name: "Admin" }],
					),
					bio: "updated",
				}),
			)
		const store = createUserStore()
		await store.refreshSession()

		await store.refreshProfile()

		expect({
			bio: store.profile?.bio,
			permissions: store.authorization?.permissions,
			roles: store.authorization?.roles?.map((role) => role.name),
			userName: store.profile?.name,
		}).toStrictEqual({
			bio: "updated",
			permissions: ["image.queue.manage"],
			roles: ["Moderator"],
			userName: "hakurei",
		})
	})

	it("replaces the session when a profile refresh returns another user", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
			)
			.mockResolvedValueOnce(
				loadedProfile(userProfile(2, "marisa", ["comment.manage"])),
			)
		const store = createUserStore()
		await store.refreshSession()
		const updateBio = store.bindCurrentSession((bio: string) => {
			store.updateProfile((profile) => ({ ...profile, bio }))
		})

		await store.refreshProfile()
		updateBio("stale")

		expect({
			bio: store.profile?.bio,
			permissions: store.authorization?.permissions,
			userName: store.profile?.name,
		}).toStrictEqual({
			bio: undefined,
			permissions: ["comment.manage"],
			userName: "marisa",
		})
	})

	it("refreshing permissions preserves edits from the signed-in user", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
			)
			.mockResolvedValueOnce(
				loadedProfile(userProfile(1, "reimu", ["comment.manage"])),
			)
		const store = createUserStore()
		await store.refreshSession()
		const updateBio = store.bindCurrentSession((bio: string) => {
			store.updateProfile((profile) => ({ ...profile, bio }))
		})

		await expect(store.refreshAuthorization()).resolves.toBe(true)
		updateBio("updated")

		expect({
			bio: store.profile?.bio,
			permissions: store.authorization?.permissions,
			userName: store.profile?.name,
		}).toStrictEqual({
			bio: "updated",
			permissions: ["comment.manage"],
			userName: "reimu",
		})
	})

	it("refreshes authorization without replacing the current profile", async () => {
		expect.hasAssertions()

		const current = {
			...userProfile(1, "reimu", ["image.queue.manage"]),
			bio: "current",
		}
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(current))
			.mockResolvedValueOnce(
				loadedProfile({
					...userProfile(1, "reimu", ["comment.manage"]),
					bio: "stale",
				}),
			)
		const store = createUserStore()
		await store.refreshSession()

		await expect(store.refreshAuthorization()).resolves.toBe(true)

		expect({
			bio: store.profile?.bio,
			permissions: store.authorization?.permissions,
		}).toStrictEqual({
			bio: "current",
			permissions: ["comment.manage"],
		})
	})

	it("replaces the session when an authorization refresh returns another user", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
			)
			.mockResolvedValueOnce(
				loadedProfile(userProfile(2, "marisa", ["comment.manage"])),
			)
		const store = createUserStore()
		await store.refreshSession()
		const updateBio = store.bindCurrentSession((bio: string) => {
			store.updateProfile((profile) => ({ ...profile, bio }))
		})

		await expect(store.refreshAuthorization()).resolves.toBe(true)
		updateBio("stale")

		expect({
			bio: store.profile?.bio,
			permissions: store.authorization?.permissions,
			userName: store.profile?.name,
		}).toStrictEqual({
			bio: undefined,
			permissions: ["comment.manage"],
			userName: "marisa",
		})
	})

	it("signing out ends the current session", async () => {
		expect.hasAssertions()

		const requests: string[] = []
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockImplementation((input) => {
				requests.push(requestPath(input))

				return Promise.resolve(Response.json({ status: "Ok", message: "" }))
			})
		const store = createUserStore()
		await store.refreshSession()

		await store.signOut()

		expect({ requests, status: store.session.status }).toStrictEqual({
			requests: ["/api/sign-out"],
			status: "anonymous",
		})
	})

	it("a failed sign-out still ends the local session", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(failedProfile(503, "Service unavailable"))
		const store = createUserStore()
		await store.refreshSession()

		await store.signOut()
		expect({
			status: store.session.status,
			userName: store.profile?.name,
		}).toStrictEqual({
			status: "anonymous",
			userName: undefined,
		})
	})

	it("signing in elsewhere while signing out preserves the newer session", async () => {
		expect.hasAssertions()

		const lockCompletions = new Map<string, Promise<void>>()
		vi.stubGlobal("navigator", {
			locks: {
				request: vi.fn<
					(name: string, operation: () => Promise<unknown>) => Promise<unknown>
				>((name: string, operation: () => Promise<unknown>) => {
					const currentLock = (
						lockCompletions.get(name) ?? Promise.resolve()
					).then(operation)
					lockCompletions.set(
						name,
						currentLock.then(
							() => undefined,
							() => undefined,
						),
					)
					return currentLock
				}),
			},
		})
		const signedInUser = Promise.withResolvers<UserProfile>()
		const signInStarted = Promise.withResolvers()
		const requests = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(loadedProfile(userProfile(2, "marisa")))
			.mockResolvedValueOnce(loadedProfile(userProfile(2, "marisa")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("reimu")
		})

		const otherTab = createUserStore()
		const signIn = otherTab.run(() => {
			signInStarted.resolve(undefined)
			return signedInUser.promise
		})
		await signInStarted.promise

		const signOut = currentUser.signOut()
		signedInUser.resolve(userProfile(2, "marisa"))
		await signIn
		dispatchSessionEventFromAnotherTab()
		await signOut

		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("marisa")
		})
		expect(
			requests.mock.calls.map(([input]) => requestPath(input)),
		).not.toContain("/api/sign-out")
	})

	it("a failed profile request does not sign out a user who signed in elsewhere", async () => {
		expect.hasAssertions()

		const profile = controlledProfileRequest()
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockImplementationOnce(profile.respond)
			.mockResolvedValueOnce(loadedProfile(userProfile(2, "marisa")))
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("reimu")
		})

		const refresh = currentUser.refreshProfile()
		await profile.started
		broadcastSessionChange()
		dispatchSessionEventFromAnotherTab()
		profile.resolve(failedProfile(401, "Unauthorized"))
		await refresh

		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("marisa")
		})
	})

	it("a newer browser session invalidates pending profile work", async () => {
		expect.hasAssertions()

		const profile = controlledProfileRequest()
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
			)
			.mockImplementationOnce(profile.respond)
		const currentUser = createUserStore()
		await currentUser.refreshSession()
		const updateBio = currentUser.bindCurrentSession((bio: string) => {
			currentUser.updateProfile((currentProfile) => ({
				...currentProfile,
				bio,
			}))
		})

		const refresh = currentUser.refreshProfile()
		await profile.started
		broadcastSessionChange()
		updateBio("stale")
		profile.resolve(
			loadedProfile(userProfile(2, "marisa", ["admin.user.read"])),
		)
		await refresh

		expect({
			bio: currentUser.profile?.bio,
			permissions: currentUser.authorization?.permissions,
			userName: currentUser.profile?.name,
		}).toStrictEqual({
			bio: undefined,
			permissions: ["image.queue.manage"],
			userName: "reimu",
		})
	})

	it("an outdated permission response cannot replace the signed-in user's access", async () => {
		expect.hasAssertions()

		const profile = controlledProfileRequest()
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockImplementationOnce(profile.respond)
			.mockResolvedValueOnce(
				loadedProfile(
					userProfile(
						2,
						"marisa",
						["comment.manage"],
						[{ id: 3, name: "Admin" }],
					),
				),
			)
		const { result: currentUser } = renderHook(useCurrentUser, {
			wrapper: UserContextProvider,
		})
		await waitFor(() => {
			expect(currentUser.profile?.name).toBe("reimu")
		})

		const refresh = currentUser.refreshAuthorization()
		await profile.started
		broadcastSessionChange()
		dispatchSessionEventFromAnotherTab()
		profile.resolve(
			loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
		)
		await refresh

		await waitFor(() => {
			expect({
				permissions: currentUser.authorization?.permissions,
				roles: currentUser.authorization?.roles?.map((role) => role.name),
				userName: currentUser.profile?.name,
			}).toStrictEqual({
				permissions: ["comment.manage"],
				roles: ["Admin"],
				userName: "marisa",
			})
		})
	})

	it("restores authorization after a network failure", async () => {
		expect.hasAssertions()

		vi.useFakeTimers()
		try {
			vi.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce(
					loadedProfile(userProfile(1, "reimu", ["image.queue.manage"])),
				)
				.mockRejectedValueOnce(new TypeError("Failed to fetch"))
				.mockResolvedValueOnce(
					loadedProfile(userProfile(1, "reimu", ["comment.manage"])),
				)
			const currentUser = createUserStore()
			await currentUser.refreshSession()

			const refresh = currentUser.refreshAuthorization()
			expect(currentUser.authorization?.permissions).toStrictEqual([])

			await vi.runAllTimersAsync()
			await expect(refresh).resolves.toBe(true)

			expect(currentUser.authorization?.permissions).toStrictEqual([
				"comment.manage",
			])
		} finally {
			vi.useRealTimers()
		}
	})

	it("a forbidden permission refresh sends only one request", async () => {
		expect.hasAssertions()

		const request = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(loadedProfile(userProfile(1, "reimu")))
			.mockResolvedValueOnce(failedProfile(403, "Forbidden"))
		const currentUser = createUserStore()
		await currentUser.refreshSession()
		request.mockClear()

		await expect(currentUser.refreshAuthorization()).resolves.toBe(false)
		expect({
			authorization: currentUser.authorization,
			requestCount: request.mock.calls.length,
		}).toStrictEqual({
			authorization: { permissions: [], roles: [] },
			requestCount: 1,
		})
	})

	it("failed permission refreshes revoke access without signing out", async () => {
		expect.hasAssertions()

		vi.useFakeTimers()
		try {
			vi.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce(
					loadedProfile(userProfile(1, "reimu", ["admin.user.read"])),
				)
				.mockRejectedValue(new TypeError("Failed to fetch"))
			const currentUser = createUserStore()
			await currentUser.refreshSession()

			const refresh = currentUser.refreshAuthorization()
			expect(currentUser.authorization?.permissions).toStrictEqual([])
			await vi.runAllTimersAsync()
			await expect(refresh).resolves.toBe(false)

			expect({
				authorization: currentUser.authorization,
				sessionStatus: currentUser.session.status,
			}).toStrictEqual({
				authorization: { permissions: [], roles: [] },
				sessionStatus: "authenticated",
			})
		} finally {
			vi.useRealTimers()
		}
	})
})
