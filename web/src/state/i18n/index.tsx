import { I18nProvider as LinguiProvier } from "@lingui-solid/solid"
import { i18n } from "@lingui/core"
import { type } from "arktype"
import type { ParentProps, Accessor, Setter } from "solid-js"
import {
	createContext,
	createEffect,
	createSignal,
	on,
	useTransition,
} from "solid-js"
import type { Transition } from "solid-js/types/reactive/signal.d.ts"

import { messages as enMsg } from "~/locale/en/messages"
import { messages as zhMsg } from "~/locale/zh-Hans/messages"
import { assertContext } from "~/utils/context"

export const AppLocale = type(`"en" | "zh-Hans"`)
export type AppLocale = typeof AppLocale.infer

const I18nContext = createContext<I18nStore>()
export function I18NProvider(props: ParentProps) {
	return (
		<I18nContext.Provider value={I18nStore.new("en")}>
			<LinguiProvier i18n={i18n}> {props.children}</LinguiProvier>
		</I18nContext.Provider>
	)
}

export class I18nStore {
	#locale: Accessor<AppLocale>
	#setLocale: Setter<AppLocale>
	inTransition: Transition[0]
	private startTransition: Transition[1]

	constructor(init: AppLocale) {
		const [locale, setLocale] = createSignal<AppLocale>(init)
		const [inTransition, startTransition] = useTransition()

		this.#locale = locale
		this.#setLocale = setLocale
		this.inTransition = inTransition
		this.startTransition = startTransition

		createEffect(
			on(locale, (locale) => {
				setDocumentLang(locale)
				switch (locale) {
					case "en":
						i18n.load(locale, enMsg)
						break
					case "zh-Hans":
						i18n.load(locale, zhMsg)
						break
					default:
					/** unreachable */
				}

				i18n.activate(locale)
			}),
		)
	}

	public get locale() {
		return this.#locale()
	}

	public static new(locale: AppLocale) {
		return new I18nStore(locale)
	}

	public setLocale(newLocale: AppLocale) {
		if (!(this.#locale() === newLocale)) {
			void this.startTransition(() => {
				this.#setLocale(newLocale)
			})
		}
	}
}

export function useI18N() {
	return assertContext(I18nContext)
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}
