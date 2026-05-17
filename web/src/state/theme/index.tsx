import type { ParentProps, Signal } from "solid-js"
import { createContext, createSignal, Suspense } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

export enum AppTheme {
	Light,
	Dark,
}

export class ThemeStore {
	private readonly signal: Signal<AppTheme>

	constructor(theme: AppTheme) {
		this.signal = createSignal(theme)
	}

	get theme(): AppTheme {
		return this.signal[0]()
	}

	static new(theme: AppTheme) {
		return new ThemeStore(theme)
	}

	static default() {
		return new ThemeStore(AppTheme.Light)
	}

	set(theme: AppTheme): void {
		this.signal[1](theme)
		this.setDocumentTheme()
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
		case AppTheme.Light: {
			return "light"
		}
		case AppTheme.Dark: {
			return "dark"
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
