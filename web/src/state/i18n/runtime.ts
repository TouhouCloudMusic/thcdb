import { i18n } from "@lingui/core"

export { i18n } from "@lingui/core"
export { Trans, useLingui } from "@lingui/solid"

const catalogs = import.meta.glob<{ messages: Record<string, string> }>(
	"../../locales/*.po",
)

export async function loadLocale(locale: string) {
	const key = `../../locales/${locale}.po`
	const catalogLoader = catalogs[key]

	if (catalogLoader === undefined) {
		throw new Error(`Unsupported locale: ${locale}`)
	}

	const { messages } = await catalogLoader()

	i18n.loadAndActivate({ locale, messages })
}
