import { either } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import { createResource, JSX } from "solid-js"
import type { SetStoreFunction } from "solid-js/store"
import { match, P } from "ts-pattern"
import type { User } from "~/database/entity/user"
import { createProvider } from "~/util/createProvider"
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

export type AppStateController = ReturnType<typeof createAppStateController>

function createAppStateController(
	state: AppState,
	setState: SetStoreFunction<AppState>
) {
	return {
		theme: () => state.theme,
		setTheme: (theme: AppTheme) => {
			setState("theme", theme)
			updateTheme(theme)
			setThemeCookie(theme)
		},
		user: () => state.user,
		setUser: (user: AppState["user"]) => setState("user", user),
		logOut: () => setState("user", undefined),
		devLogIn: () =>
			setState("user", {
				id: 1,
				username: "admin",
			}),
	}
}

const [_AppStateProvider, useAppState] = createProvider<
	AppState,
	AppStateController
>(createAppStateController)

export { useAppState }
export function AppStateProvider(props: { children: JSX.Element }) {
	const [serverTheme] = createResource(() => getThemeCookie())
	const initTheme: AppTheme = pipe(
		serverTheme(),
		(x) =>
			match(x)
				.with(P.nullish, () => either.right(AppTheme.light))
				.otherwise((x) =>
					either.tryCatch(() => parseInt(x) as AppTheme, either.toError)
				),
		either.match(
			() => AppTheme.light,
			(x) => x
		)
	)
	return (
		<_AppStateProvider
			defaultState={{
				...devAppState,
				theme: initTheme,
			}}>
			{props.children}
		</_AppStateProvider>
	)
}
