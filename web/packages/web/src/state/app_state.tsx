import { createResource, JSX } from "solid-js"
import type { SetStoreFunction } from "solid-js/store"
import type { User } from "~/database/entity/user"
import { createProvider } from "~/util/createProvider"
import { getCookieTheme, setCookieTheme, updateTheme } from "./theme"

export const enum AppTheme {
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
			setCookieTheme(theme)
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
	const [serverTheme] = createResource(() => getCookieTheme())
	const initTheme = parseInt(serverTheme()?.toString() ?? "0", 10)
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
