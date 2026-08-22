import type { ParentProps } from "solid-js"
import { createContext, onCleanup, onMount } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import { subscribeTabSessionChanges } from "./browserSession"
import type { UserStore } from "./store"
import { createUserStore } from "./store"

export type { SessionProfile, SessionState, UserStore } from "./store"
export { createUserStore } from "./store"

const UserContext = createContext<UserStore>()

export const useCurrentUser = () => assertContext(UserContext, "UserContext")

export function UserContextProvider(props: ParentProps) {
	const store = createUserStore()

	onMount(() => {
		store.trySignIn()

		onCleanup(subscribeTabSessionChanges(store.refreshSession))
	})

	return (
		<UserContext.Provider value={store}>{props.children}</UserContext.Provider>
	)
}
