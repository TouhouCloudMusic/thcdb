import { createAsync, type RouteDefinition } from "@solidjs/router"
import { type Accessor } from "solid-js"
import { useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"
import { cacheFetchDictionary } from "../i18n"
import { ArtistFormLayout } from "../layout"

export const route = {
	preload: () => {
		const locale = getLocaleCookie()
		void cacheFetchDictionary(locale)
	},
} satisfies RouteDefinition

export default function AddArtistPage() {
	const dict = createAsync(() => cacheFetchDictionary(useI18N().locale()))
	return (
		<ArtistFormLayout
			data={(() => null) as Accessor<null>}
			dict={dict}
		/>
	)
}
