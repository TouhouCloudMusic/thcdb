import {
	createAsync,
	redirect,
	useParams,
	type RouteDefinition,
} from "@solidjs/router"
import { useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"
import { getArtistDataEditArtistPage } from "../data/cache"
import { cacheFetchDictionary } from "../i18n"
import { ArtistFormLayout } from "../layout"

export const route = {
	preload: () => {
		const id = useParams()["id"]
		void getArtistDataEditArtistPage(id)

		const locale = getLocaleCookie()
		void cacheFetchDictionary(locale)
	},
	matchFilters: {
		id: /^\d+$/,
	},
} satisfies RouteDefinition

export default function EditArtistPage() {
	const data = createAsync(() => getArtistDataEditArtistPage(useParams()["id"]))
	const dict = createAsync(() => cacheFetchDictionary(useI18N().locale()))

	return (
		<ArtistFormLayout
			data={data}
			dict={dict}
		/>
	)
}
