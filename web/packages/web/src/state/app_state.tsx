import * as Either from "fp-ts/either"
import { pipe } from "fp-ts/function"
import {
	createResource,
	JSX,
	Show
} from "solid-js"
import type { SetStoreFunction } from "solid-js/store"
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
		themeStr: () => {
			switch (state.theme) {
				case AppTheme.light:
					return "light"
				case AppTheme.dark:
					return "dark"
				default:
					return "light"
			}
		},
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

	return (
		<Show when={serverTheme()}>
			{(serverTheme) => (
				<_AppStateProvider
					defaultState={{
						...devAppState,
						theme: parseThemeIDToStr(serverTheme()),
					}}>
					{props.children}
				</_AppStateProvider>
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
