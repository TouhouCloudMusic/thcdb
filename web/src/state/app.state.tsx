import { SetStoreFunction } from "solid-js/store"
import { User } from "~/entity/user"
import { createProviderF } from "~/util/createProvider"
import { updateTheme, setCookieTheme } from "./theme"

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

export const [AppStateProvider, useAppState] = createProviderF<
	AppState,
	AppStateController
>(createAppStateController)
