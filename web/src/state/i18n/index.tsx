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

import { assertContext } from "~/utils/context"

import { initUserLang } from "./init"

export const AppLang = type(`"en" | "zh-Hans"`)
export type AppLang = typeof AppLang.infer

const I18nContext = createContext<I18nStore>()
export function I18NProvider(props: ParentProps) {
	const lang = initUserLang()
	return (
		<I18nContext.Provider value={I18nStore.new(lang)}>
			<LinguiProvier i18n={i18n}> {props.children}</LinguiProvier>
		</I18nContext.Provider>
	)
}

export class I18nStore {
	#locale: Accessor<AppLang>
	#setLocale: Setter<AppLang>
	inTransition: Transition[0]
	private startTransition: Transition[1]

	constructor(init: AppLang) {
		const [locale, setLocale] = createSignal<AppLang>(init)
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
						void import("../../locale/en/messages.ts").then(({ messages }) => {
							i18n.load(locale, messages)
						})

						break
					case "zh-Hans":
						void import(`../../locale/zh-Hans/messages.ts`).then(
							({ messages }) => {
								i18n.load(locale, messages)
							},
						)
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

	public static new(lang: AppLang) {
		return new I18nStore(lang)
	}

	public setLocale(newLocale: AppLang) {
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

function setDocumentLang(locale: AppLang) {
	document.documentElement.lang = locale
}
