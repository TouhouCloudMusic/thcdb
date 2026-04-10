import type { UserProfile } from "@thc/api"
import { UserApi, AuthApi, NotificationApi } from "@thc/api"
import { ObjExt } from "@thc/toolkit/data"
import { Either as E, Option } from "effect"
import type { ParentProps } from "solid-js"
import { createContext, onMount } from "solid-js"
import { createMutable } from "solid-js/store"
import * as v from "valibot"

import { assertContext } from "~/utils/solid/assertContext"

const SIGNED_IN_KEY = "is_signed_in"
const NOTIFICATION_KEYS = [
	"comment_reply_enabled",
	"comment_mention_enabled",
	"correction_status_enabled",
	"new_follower_enabled",
] as const

function SignedInHint_check() {
	try {
		return globalThis.localStorage.getItem(SIGNED_IN_KEY) === "1"
	} catch {
		return false
	}
}

function SignedInHint_set(value: boolean) {
	try {
		if (value) {
			globalThis.localStorage.setItem(SIGNED_IN_KEY, "1")
		} else {
			globalThis.localStorage.removeItem(SIGNED_IN_KEY)
		}
	} catch {
		void 0
	}
}

export const enum NotificationState {
	None,
	Unread,
	Muted,
}

const NotificationSocketMessageSchema = v.object({
	type: v.optional(v.string()),
	data: v.optional(v.unknown()),
})

const getObject = (x: unknown): Record<string, unknown> | undefined => {
	if (ObjExt.isRecord(x)) {
		return x
	}
}

function hasEnabledNotification(
	preference: Record<string, unknown> | undefined,
) {
	return NOTIFICATION_KEYS.some((key) => {
		const value = preference?.[key]
		return typeof value === "boolean" ? value : true
	})
}

function isUnauthorized(error: { statusCode?: number }) {
	return error.statusCode === 401
}

export class UserStore {
	private ctx: UserContext

	constructor(ctx: UserContext) {
		this.ctx = ctx
		return createMutable(this)
	}

	private isLoading = false
	private notificationUnreadCount = 0
	private notificationSocket: WebSocket | undefined = undefined
	private notificationReconnectDelayMs = 1000
	private notificationReconnectTimer:
		| ReturnType<typeof globalThis.setTimeout>
		| undefined = undefined

	async trySignIn() {
		if (this.ctx?.user || this.isLoading || !SignedInHint_check()) return
		await this.flush()
	}

	async flush() {
		if (this.isLoading || !SignedInHint_check()) return

		this.isLoading = true
		const result = await UserApi.profile()
		this.isLoading = false

		return E.match(result, {
			onLeft: (error) => {
				if (isUnauthorized(error)) {
					this.clearSession()
				}
			},
			onRight: (right) => {
				const user = Option.getOrUndefined(right)
				if (!user) {
					this.clearSession()
					return
				}
				this.sign_in({ user })
				return user
			},
		})
	}

	get notification_state() {
		if (!this.ctx?.user) {
			return NotificationState.None
		}
		if (this.notificationUnreadCount > 0) {
			return NotificationState.Unread
		}

		const settings = getObject(this.ctx.user.settings)
		const notification = settings
			? getObject(settings["notification"])
			: undefined
		if (!hasEnabledNotification(notification)) {
			return NotificationState.Muted
		}
		return NotificationState.None
	}

	get user() {
		if (this.ctx) {
			return this.ctx.user
		}
	}

	get is_signed_in() {
		return this.user !== undefined
	}

	get is_loading() {
		return this.isLoading
	}

	sign_in(ctx: UserContext) {
		this.ctx = ctx
		SignedInHint_set(ctx?.user !== undefined)
		void this.refreshNotifications()
		this.connectNotificationSocket()
	}

	async sign_out() {
		const result = await AuthApi.signout()

		this.clearSession()
		E.mapLeft(result, (error) => {
			console.debug("Sign out failed", error)

			throw error
		})
	}

	private clearSession() {
		this.ctx = undefined
		SignedInHint_set(false)
		this.notificationUnreadCount = 0
		this.disconnectNotificationSocket()
	}

	private disconnectNotificationSocket() {
		if (this.notificationReconnectTimer !== undefined) {
			globalThis.clearTimeout(this.notificationReconnectTimer)
			this.notificationReconnectTimer = undefined
		}
		if (this.notificationSocket) {
			this.notificationSocket.close()
			this.notificationSocket = undefined
		}
		this.notificationReconnectDelayMs = 1000
	}

	private connectNotificationSocket() {
		if (!this.ctx?.user) return
		if (
			this.notificationSocket
			&& (this.notificationSocket.readyState === WebSocket.OPEN
				|| this.notificationSocket.readyState === WebSocket.CONNECTING)
		) {
			return
		}

		const origin = globalThis.location.origin
		const url = new globalThis.URL("/api/ws/notifications", origin)
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

		const ws = new globalThis.WebSocket(url.toString())
		this.notificationSocket = ws

		ws.addEventListener("open", () => {
			this.notificationReconnectDelayMs = 1000
		})

		ws.addEventListener("message", (evt) => {
			try {
				const parsed = v.safeParse(
					NotificationSocketMessageSchema,
					JSON.parse(String(evt.data)),
				)
				if (!parsed.success) return

				if (parsed.output.type === "Notification") {
					this.notificationUnreadCount += 1
				}
			} catch {
				// Ignore invalid messages.
			}
		})

		ws.addEventListener("close", () => {
			if (!this.ctx?.user) return
			if (this.notificationReconnectTimer !== undefined) return

			const delay = this.notificationReconnectDelayMs
			this.notificationReconnectDelayMs = Math.min(delay * 2, 30_000)

			this.notificationReconnectTimer = globalThis.setTimeout(() => {
				this.notificationReconnectTimer = undefined
				this.connectNotificationSocket()
			}, delay)
		})
	}

	private async refreshNotifications() {
		const unread = await NotificationApi.unreadCount()

		E.map(unread, (count) => {
			this.notificationUnreadCount = count
		})
	}
}

export type UserContext =
	| {
			user: UserProfile
	  }
	| undefined

const UserContext = createContext<UserStore>()

export const useCurrentUser = () => assertContext(UserContext, "UserContext")

export async function ensureCurrentUser() {
	if (!SignedInHint_check()) {
		return
	}

	const result = await UserApi.profile()

	if (E.isLeft(result)) {
		if (isUnauthorized(result.left)) {
			SignedInHint_set(false)
		}
		return
	}

	const user = Option.getOrUndefined(result.right)

	if (!user) {
		SignedInHint_set(false)
	}

	return user
}

export function UserContextProvider(props: ParentProps) {
	const store = new UserStore(undefined)
	onMount(() => {
		void store.trySignIn()
	})
	return (
		<UserContext.Provider value={store}>{props.children}</UserContext.Provider>
	)
}
