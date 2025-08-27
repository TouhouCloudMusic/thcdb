import type { ParentProps, Signal } from "solid-js"
import { createContext, createSignal, Suspense } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

export enum AppTheme {
	Light,
	Dark,
}

export class ThemeStore {
	private signal: Signal<AppTheme>

	constructor(theme: AppTheme) {
		this.signal = createSignal(theme)
	}

	public get theme(): AppTheme {
		return this.signal[0]()
	}

	public static new(theme: AppTheme) {
		return new ThemeStore(theme)
	}

	public static default() {
		return new ThemeStore(AppTheme.Light)
	}

	public set(theme: AppTheme): void {
		this.signal[1](theme)

		switch (theme) {
			case AppTheme.Dark: {
				this.setDocumentTheme()
				break
			}
			default: {
				this.setDocumentTheme()
			}
		}
	}

	setDocumentTheme() {
		setDocumentTheme(this.theme)
	}
}

export const ThemeContext = createContext<ThemeStore>()
export const useTheme = () => assertContext(ThemeContext)

export function ThemeProvider(props: ParentProps) {
	return (
		<Suspense>
			<ThemeContext.Provider value={ThemeStore.default()}>
				{props.children}
			</ThemeContext.Provider>
		</Suspense>
	)
}

function toString(theme: AppTheme) {
	switch (theme) {
		case AppTheme.Dark: {
			return "dark"
		}
		default: {
			return "light"
		}
	}
}

function setDocumentTheme(theme: AppTheme) {
	document.querySelector("#app")!.classList.add("notransition")
	document.documentElement.dataset["mode"] = toString(theme)
	setTimeout(() => {
		document.querySelector("#app")!.classList.remove("notransition")
	}, 0)
}
