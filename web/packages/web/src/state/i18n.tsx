import {
	Accessor,
	createContext,
	createMemo,
	JSXElement,
	onMount,
} from "solid-js"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import { getCookie } from "vinxi/http"
import { Type, type Static } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"

const locale = Type.Union([Type.Literal("en"), Type.Literal("zh_hans")])
const localeCompiler = TypeCompiler.Compile(locale)
type Locale = Static<typeof locale>

function getLocaleCookie(): Locale | null {
	"use server"
	const locale = getCookie("app_locale")
	if (localeCompiler.Check(locale)) {
		return locale
	} else return null
}

function setLocaleCookie(locale: Locale) {
	document.cookie = `app_locale=${locale}`
}

class I18NController {
	#locale: Locale
	private localeMemo = createMemo(() => this.#locale)
	constructor(locale?: Locale) {
		this.#locale = locale ?? getLocaleCookie() ?? "en"
		this.locale = this.locale.bind(this)
		this.setlocale = this.setlocale.bind(this)
	}

	locale(): Locale {
		return this.localeMemo()
	}

	setlocale(locale: Locale) {
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
