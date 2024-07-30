import { createAsync, type RouteDefinition } from "@solidjs/router"
import { createSignal } from "solid-js"
import { useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"
import { cacheFetchDictionary } from "../i18n"
import { ArtistFormLayout } from "../layout"

export const route = {
	load: () => {
		const locale = getLocaleCookie()
		void cacheFetchDictionary(locale)
	},
} satisfies RouteDefinition

export default function AddArtistPage() {
	const [NULL] = createSignal(null)
	const dict = createAsync(() => cacheFetchDictionary(useI18N().locale()))
	return (
		<ArtistFormLayout
			data={NULL}
			dict={dict}
		/>
	)
}
