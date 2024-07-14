import * as Either from "fp-ts/either"
import { pipe } from "fp-ts/function"
import type { ParentProps, Signal } from "solid-js"
import { createContext, createResource, createSignal, Show } from "solid-js"
import type { User } from "~/database/entity/user"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import { getThemeCookie, setThemeCookie, updateTheme } from "./theme"

export enum AppTheme {
	light,
	dark,
}

export interface AppState {
	theme?: AppTheme
	user: User | undefined
}

export const devAppState: AppState = {
	// theme: AppTheme.light,
	user: {
		id: 1,
		username: "admin",
	},
}

class AppStateController {
	private userSignal: Signal<User | undefined>
	private themeSignal: Signal<AppTheme>

	constructor(user: AppState["user"], theme: AppTheme) {
		this.userSignal = createSignal(user)
		this.themeSignal = createSignal(theme)
	}

	public theme(): AppTheme {
		return this.themeSignal[0]()
	}

	public setTheme(theme: AppTheme) {
		const newTheme = this.themeSignal[1](theme)
		updateTheme(theme)
		setThemeCookie(newTheme)
	}

	public user(): User | undefined {
		return this.userSignal[0]()
	}

	public setUser(user: User | undefined) {
		return this.userSignal[1](user)
	}

	public logOut() {
		this.userSignal[1](undefined)
	}

	public devLogIn() {
		this.userSignal[1]({
			id: 1,
			username: "admin",
		})
	}
}

const AppState = createContext<AppStateController>()
export const useAppState = () => useContextUnsave(AppState)

export function AppStateProvider(props: ParentProps) {
	const [serverTheme] = createResource(() => getThemeCookie())
	return (
		<Show when={serverTheme()}>
			{(serverTheme) => (
				<AppState.Provider
					value={
						new AppStateController(
							devAppState.user,
							parseThemeIDToStr(serverTheme())
						)
					}>
					{props.children}
				</AppState.Provider>
			)}
		</Show>
	)
}

function parseThemeIDToStr(theme: string) {
	return pipe(
		Either.tryCatch(() => parseInt(theme) as AppTheme, Either.toError),
		Either.match(
			() => AppTheme.light,
			(x) => x
		)
	)
}
/**
 * For future
 */

// class UserController {
// 	protected userSignal: Signal<AppState["user"]>
// 	constructor(user: AppState["user"]) {
// 		this.userSignal = createSignal(user)
// 	}
// }

// class ThemeController {
// 	protected themeSignal: Signal<AppTheme>

// 	constructor(theme: AppTheme) {
// 		this.themeSignal = createSignal(theme)
// 	}

// 	public theme() {
// 		return this.themeSignal[0]()
// 	}

// 	public setTheme(theme: AppTheme) {
// 		this.themeSignal[1](theme)
// 	}
// }
