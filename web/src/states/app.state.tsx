import { SetStoreFunction } from "solid-js/store"
import { createProvider } from "~/utils/createProvider"

export interface AppState {
	theme: "light" | "dark"
	user:
		| {
				username: string
		  }
		| undefined
}

export const defaultAppState: AppState = {
	theme: "light",
	user: {
		username: "admin",
	},
}

type AppController = ReturnType<typeof createAppStateController>

function createAppStateController(
	state: AppState,
	setState: SetStoreFunction<AppState>
) {
	const appStateController = {
		appTheme: () => state.theme,
		setAppTheme: (theme: AppState["theme"]) => setState("theme", theme),
		user: () => state.user,
		setUser: (user: AppState["user"]) => setState("user", user),
		logOut: () => setState("user", undefined),
	}
	return appStateController
}

export const [AppStateProvider, useAppState] = createProvider<
	AppState,
	AppController
>(createAppStateController)
