import { Type, type Static } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import { createContext, createMemo, JSXElement, onMount } from "solid-js"
import { getCookie } from "vinxi/http"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import Cookie from "js-cookie"

const appLocale = Type.Union([Type.Literal("en"), Type.Literal("zh_hans")])
const appLocaleCompiler = TypeCompiler.Compile(appLocale)
export type AppLocale = Static<typeof appLocale>

function getLocaleCookie(): AppLocale | null {
	"use server"
	const locale = getCookie("app_locale")
	if (appLocaleCompiler.Check(locale)) {
		return locale
	} else return null
}

function setLocaleCookie(locale: AppLocale) {
	Cookie.set("app_locale", locale)
}

class I18NController {
	#locale: AppLocale
	private localeMemo = createMemo(() => this.#locale)
	constructor(locale?: AppLocale) {
		this.#locale = locale ?? getLocaleCookie() ?? "en"
		this.setlocale = this.setlocale.bind(this)
	}

	get locale(): AppLocale {
		return this.localeMemo()
	}

	setlocale(locale: AppLocale) {
		this.#locale = locale
		setLocaleCookie(locale)
	}
}

const I18NContext = createContext<I18NController>()
export function useI18N() {
	return useContextUnsave(I18NContext)
}

export function I18NProvider(props: { children: JSXElement }) {
	onMount(() => {
		if (!getLocaleCookie()) {
			setLocaleCookie("en")
		}
	})
	return (
		<I18NContext.Provider value={new I18NController(getLocaleCookie() ?? "en")}>
			{props.children}
		</I18NContext.Provider>
	)
}
