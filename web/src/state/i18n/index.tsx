import { I18nProvider as LinguiProvider } from "@lingui/solid"
import type { ParentProps } from "solid-js"
import { createContext, createSignal } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import { persistLocalePreference } from "./init"
import { i18n, loadLocale } from "./runtime"

export type AppLocale = "en" | "zh-CN"

const LIST_SEPARATOR_BY_LOCALE = {
	en: ", ",
	"zh-CN": "、",
} as const satisfies Record<AppLocale, string>

type I18nStore = {
	locale: () => AppLocale
	listSeparator: () => string
	isSwitchingLocale: () => boolean
	setLocale: (lang: AppLocale) => Promise<void>
}

const I18nContext = createContext<I18nStore>()
export function I18NProvider(props: ParentProps<{ initialLocale: AppLocale }>) {
	const [locale, setLocale] = createSignal<AppLocale>(props.initialLocale)
	const [isSwitchingLocale, setIsSwitchingLocale] = createSignal(false)
	const listSeparator = () => LIST_SEPARATOR_BY_LOCALE[locale()]

	async function setLocaleValue(next: AppLocale) {
		if (locale() === next || isSwitchingLocale()) return

		setIsSwitchingLocale(true)
		try {
			await loadLocale(next)
			persistLocalePreference(next)
			setLocale(next)
			setDocumentLang(next)
		} finally {
			setIsSwitchingLocale(false)
		}
	}

	setDocumentLang(props.initialLocale)

	return (
		<LinguiProvider i18n={i18n}>
			<I18nContext.Provider
				value={{
					locale,
					listSeparator,
					isSwitchingLocale,
					setLocale: setLocaleValue,
				}}
			>
				{props.children}
			</I18nContext.Provider>
		</LinguiProvider>
	)
}

export function useI18N() {
	return assertContext(I18nContext)
}

function setDocumentLang(locale: AppLocale) {
	globalThis.document.documentElement.lang = locale
}
