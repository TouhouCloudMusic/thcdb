import { action, redirect, useAction } from "@solidjs/router"
import { type User } from "@touhouclouddb/database/interfaces"
import {
	type ParentProps,
	type Signal,
	createContext,
	createSignal,
} from "solid-js"
import { signout } from "~/database/server"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

const signOutA = action(async () => {
	"use server"
	await signout()
	throw redirect("/")
})

class UserController {
	protected userSignal: Signal<User | null>
	constructor(user: User | null) {
		this.userSignal = createSignal(user)
	}

	public user(): User | null {
		return this.userSignal[0]()
	}

	public isSignedIn(): boolean {
		return !!this.user()
	}

	public async signOut() {
		const signOut = useAction(signOutA)
		return await signOut()
	}
}

const UserContext = createContext<UserController>()

export const useUser = () => useContextUnsave(UserContext)

export function UserStateProvider(props: ParentProps) {
	// const user = createAsync(() => getCurrentUser())

	return (
		<UserContext.Provider value={new UserController(null)}>
			{props.children}
		</UserContext.Provider>
	)
}
