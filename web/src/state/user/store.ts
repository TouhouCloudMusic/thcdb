import type { UserProfile } from "@thc/api"
import { untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"

import type { UserAuthorization } from "~/domain/user/authorization"
import { signOut as requestSignOut } from "~/hey-api"
import {
	QUERY_CLIENT,
	resetAuthorizationQueries,
	resetSessionQueries,
} from "~/state/tanstack"

import {
	broadcastSessionChange,
	readSessionRevision,
	withSessionLock,
} from "./browserSession"
import {
	AUTHORIZATION_QUERY,
	requestCurrentUser,
	SESSION_QUERY,
} from "./sessionRequest"

export type SessionProfile = Omit<UserProfile, "permissions" | "roles">
type AuthenticatedSession = {
	status: "authenticated"
	profile: SessionProfile
	authorization: UserAuthorization
}

export type SessionState =
	| { status: "loading" }
	| { status: "anonymous" }
	| AuthenticatedSession

type UserStoreState = {
	session: SessionState
	browserRevision: string | undefined
}

function authenticatedSession(user: UserProfile): AuthenticatedSession {
	const { permissions, roles, ...profile } = user

	return {
		status: "authenticated",
		profile,
		authorization: { permissions, roles },
	}
}

export function createUserStore() {
	const [state, setState] = createStore<UserStoreState>({
		session: { status: "loading" },
		browserRevision: readSessionRevision(),
	})

	const replaceSession = (
		next: SessionState,
		browserRevision: string | undefined,
	) => {
		setState(
			produce((draft) => {
				draft.session = next
				draft.browserRevision = browserRevision
			}),
		)
	}

	const hasSessionRevision = (browserRevision: string | undefined) =>
		untrack(
			() =>
				state.browserRevision === browserRevision
				&& browserRevision === readSessionRevision(),
		)

	const hasUserSession = (
		userId: number,
		browserRevision: string | undefined,
	) =>
		untrack(
			() =>
				state.session.status === "authenticated"
				&& state.session.profile.id === userId
				&& hasSessionRevision(browserRevision),
		)

	const endSession = () => {
		replaceSession({ status: "anonymous" }, broadcastSessionChange())
		void resetSessionQueries()
	}

	const loadSession = async () => {
		const browserRevision = state.browserRevision
		const replaceLoadedSession = (next: SessionState) => {
			replaceSession(next, browserRevision)
		}

		try {
			const currentUser = await QUERY_CLIENT.fetchQuery(SESSION_QUERY)
			if (!hasSessionRevision(browserRevision)) return false

			if (currentUser === null) {
				replaceLoadedSession({ status: "anonymous" })
				void resetSessionQueries()
				return false
			}

			replaceLoadedSession(authenticatedSession(currentUser))
			return true
		} catch {
			if (!hasSessionRevision(browserRevision)) return false

			console.error("Failed to load the current user")
			replaceLoadedSession({ status: "anonymous" })
			void resetSessionQueries()
			return false
		}
	}

	return {
		get session(): SessionState {
			return state.session
		},
		get profile() {
			const session = state.session
			return session.status === "authenticated" ? session.profile : undefined
		},
		get authorization() {
			const session = state.session
			return session.status === "authenticated"
				? session.authorization
				: undefined
		},
		bindCurrentSession<Args extends unknown[], Result>(
			fn: (...args: Args) => Result,
		) {
			const session = state.session
			const userId =
				session.status === "authenticated" ? session.profile.id : undefined
			const browserRevision = state.browserRevision

			return (...args: Args): Result | undefined => {
				if (userId === undefined || !hasUserSession(userId, browserRevision)) {
					return
				}

				return fn(...args)
			}
		},
		isCurrentUser(username: string) {
			const session = state.session
			return (
				session.status === "authenticated" && session.profile.name === username
			)
		},
		async refreshAuthorization(): Promise<boolean> {
			const session = state.session
			if (session.status !== "authenticated") return false
			const userId = session.profile.id
			const browserRevision = state.browserRevision

			setState(
				produce((draft) => {
					if (draft.session.status !== "authenticated") return
					if (draft.session.profile.id !== userId) return

					draft.session.authorization = { permissions: [], roles: [] }
				}),
			)
			await resetAuthorizationQueries()
			if (!hasUserSession(userId, browserRevision)) return false

			try {
				const currentUser = await QUERY_CLIENT.fetchQuery(AUTHORIZATION_QUERY)
				if (!hasUserSession(userId, browserRevision)) return false

				if (currentUser === null) {
					endSession()
					return false
				}

				if (currentUser.id !== userId) {
					replaceSession(authenticatedSession(currentUser), browserRevision)
					void resetSessionQueries()
					return true
				}

				setState(
					produce((draft) => {
						if (draft.session.status !== "authenticated") return
						if (draft.session.profile.id !== userId) return

						draft.session.authorization = {
							permissions: currentUser.permissions,
							roles: currentUser.roles,
						}
					}),
				)
				return true
			} catch {
				console.error("Failed to refresh authorization")
				return false
			}
		},
		async refreshProfile() {
			const session = state.session
			if (session.status !== "authenticated") return
			const userId = session.profile.id
			const browserRevision = state.browserRevision

			let currentUser: UserProfile | null
			try {
				currentUser = await requestCurrentUser()
			} catch {
				if (!hasUserSession(userId, browserRevision)) return

				throw new Error("Failed to refresh the current user")
			}
			if (!hasUserSession(userId, browserRevision)) return

			if (currentUser === null) {
				endSession()
				return
			}

			if (currentUser.id !== userId) {
				replaceSession(authenticatedSession(currentUser), browserRevision)
				void resetSessionQueries()
				return
			}

			const refreshed = authenticatedSession(currentUser)
			setState(
				produce((draft) => {
					if (draft.session.status !== "authenticated") return
					if (draft.session.profile.id !== userId) return

					draft.session.profile = refreshed.profile
				}),
			)
		},
		refreshSession: async () => {
			replaceSession({ status: "loading" }, readSessionRevision())
			await resetSessionQueries()
			return loadSession()
		},
		async run<T>(computation: () => T | PromiseLike<T>) {
			const result = await withSessionLock(async () => {
				const value = await computation()

				replaceSession({ status: "loading" }, broadcastSessionChange())
				return value
			})

			await resetSessionQueries()
			await loadSession()
			return result
		},
		async signOut() {
			const session = state.session
			if (session.status !== "authenticated") return
			const userId = session.profile.id
			const browserRevision = state.browserRevision

			await withSessionLock(async () => {
				if (!hasUserSession(userId, browserRevision)) return

				try {
					const response = await requestSignOut()
					if (
						response.error !== undefined
						&& response.response?.status !== 401
					) {
						console.debug("Sign out request failed")
					}
				} catch {
					console.debug("Sign out request failed")
				}

				if (hasUserSession(userId, browserRevision)) {
					endSession()
				}
			})
		},
		trySignIn() {
			if (state.session.status !== "loading") return
			void loadSession()
		},
		updateProfile(updater: (profile: SessionProfile) => SessionProfile) {
			setState(
				produce((draft) => {
					if (draft.session.status !== "authenticated") return

					draft.session.profile = updater(draft.session.profile)
				}),
			)
		},
	}
}

export type UserStore = Omit<ReturnType<typeof createUserStore>, "trySignIn">
