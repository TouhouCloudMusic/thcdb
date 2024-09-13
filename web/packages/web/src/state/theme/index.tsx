import dayjs from "dayjs"
import * as Either from "fp-ts/either"
import { pipe } from "fp-ts/function"
import Cookie from "js-cookie"
import type { ParentProps, Signal } from "solid-js"
import {
	createContext,
	createResource,
	createSignal,
	Show,
	Suspense,
} from "solid-js"
import { match } from "ts-pattern"
import { getCookie } from "vinxi/http"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

export enum AppTheme {
	light,
	dark,
}

export class ThemeController {
	private themeSignal: Signal<AppTheme>

	constructor(theme: AppTheme) {
		this.themeSignal = createSignal(theme)
	}

	public value(): AppTheme {
		return this.themeSignal[0]()
	}

	public set(theme: AppTheme): void {
		this.themeSignal[1](theme)
		updateTheme(theme)
		setThemeCookie(theme)
	}
}

export const ThemeContext = createContext<ThemeController>()
export const useTheme = () => useContextUnsave(ThemeContext)

export function ThemeProvider(props: ParentProps) {
	const [serverTheme] = createResource(() => getThemeCookie())
	return (
		<Suspense>
			<Show when={serverTheme()}>
				{(serverTheme) => (
					<ThemeContext.Provider
						value={new ThemeController(mapThemeCookieToID(serverTheme()))}>
						{props.children}
					</ThemeContext.Provider>
				)}
			</Show>
		</Suspense>
	)
}

function mapThemeCookieToID(str: string) {
	const id = pipe(
		Either.tryCatch(() => parseInt(str), Either.toError),
		Either.match(
			() => AppTheme.light,
			(x) => x
		)
	)
	return match(id)
		.with(AppTheme.light, (x) => x)
		.with(AppTheme.dark, (x) => x)
		.otherwise(() => AppTheme.light)
}

export function updateTheme(theme: AppTheme) {
	switch (theme) {
		case AppTheme.dark:
			setDoucmentTheme("dark")
			break
		default:
			setDoucmentTheme("light")
	}
}

function getThemeCookie(): string {
	"use server"
	const themeID = getCookie("app_theme") ?? "0"
	return themeID
}

function setThemeCookie(theme: AppTheme) {
	Cookie.set("app_theme", String(theme), {
		expires: dayjs().add(30, "days").toDate(),
	})
}

function setDoucmentTheme(str: string) {
	document.getElementById("app")!.classList.add("notransition")
	document.documentElement.setAttribute("data-mode", str)
	setTimeout(() => {
		document.getElementById("app")!.classList.remove("notransition")
	}, 0)
}
