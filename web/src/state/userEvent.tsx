import { createEffect, createMemo, onCleanup } from "solid-js"

import { refreshNotificationQueries } from "~/state/notification"
import { useCurrentUser } from "~/state/user"

const USER_EVENT_STREAM_URL = "/api/user-events/stream"

export function UserEventStream() {
	const currentUser = useCurrentUser()
	const sessionUsername = createMemo(() => currentUser.profile?.name)
	const refreshAuthorization = () => {
		void currentUser.refreshAuthorization()
	}
	createEffect(() => {
		const username = sessionUsername()
		if (username === undefined) return

		const eventSource = new EventSource(USER_EVENT_STREAM_URL)

		eventSource.addEventListener("notification-inbox-updated", () => {
			void refreshNotificationQueries().catch(console.error)
		})
		eventSource.addEventListener("authorization-updated", refreshAuthorization)

		onCleanup(() => {
			eventSource.close()
		})
	})

	return null
}
