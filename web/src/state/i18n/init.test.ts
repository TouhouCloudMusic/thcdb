import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	DEFAULT_LOCALE,
	matchLocale,
	persistLocalePreference,
	resolveBrowserLocale,
	resolveInitialLocale,
} from "./init"

function createStorage() {
	const storage = new Map<string, string>()

	return {
		clear() {
			storage.clear()
		},
		getItem(key: string) {
			return storage.get(key) ?? null
		},
		removeItem(key: string) {
			storage.delete(key)
		},
		setItem(key: string, value: string) {
			storage.set(key, value)
		},
	}
}

function stubNavigator(languages: string[], language: string | undefined) {
	vi.stubGlobal("navigator", {
		languages,
		language,
	})
}

describe("i18n init", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createStorage())
		globalThis.localStorage.clear()
	})

	afterEach(() => {
		globalThis.localStorage.clear()
		vi.unstubAllGlobals()
	})

	it("matches supported locales", () => {
		expect(matchLocale("en-US")).toBe("en")
		expect(matchLocale("zh-TW")).toBe("zh-Hans")
		expect(matchLocale("fr-FR")).toBeUndefined()
	})

	it("resolves browser locales by priority", () => {
		expect(resolveBrowserLocale(["fr-FR", "zh-CN"], "en-US")).toBe("zh-Hans")
		expect(resolveBrowserLocale(["fr-FR"], "en-US")).toBe("en")
		expect(resolveBrowserLocale(["fr-FR"], "de-DE")).toBe(DEFAULT_LOCALE)
	})

	it("prefers the saved locale", () => {
		persistLocalePreference("zh-Hans")
		stubNavigator(["en-US"], "en-US")

		expect(resolveInitialLocale()).toBe("zh-Hans")
	})

	it("persists the detected browser locale", () => {
		stubNavigator(["fr-FR", "zh-CN"], "en-US")

		expect(resolveInitialLocale()).toBe("zh-Hans")
		expect(globalThis.localStorage.getItem("userLang")).toBe("zh-Hans")
	})
})
