import { type User as _U } from "@auth/core/types"
import { createSession, signIn, signOut } from "@solid-mediakit/auth/client"
import {
	type ParentProps,
	type Signal,
	createContext,
	createSignal,
} from "solid-js"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

interface User extends _U {}

class UserController {
	protected userSignal: Signal<User | undefined>
	constructor(user?: User) {
		this.userSignal = createSignal(user)
	}

	public user(): User | undefined {
		return this.userSignal[0]()
	}

	public setUser(user: User) {
		return this.userSignal[1](user)
	}

	public async signInWithGitHub() {
		await signIn("github")
	}

	public async signOut() {
		await signOut({
			redirectTo: "/",
		})
	}
}

const UserContext = createContext<UserController>()

export const useUser = () => useContextUnsave(UserContext)

export function UserStateProvider(props: ParentProps) {
	const session = createSession()

	return (
		<UserContext.Provider value={new UserController(session()?.user)}>
			{props.children}
		</UserContext.Provider>
	)
}
