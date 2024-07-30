import {
	createAsync,
	redirect,
	useParams,
	type RouteDefinition,
} from "@solidjs/router"
import { createEffect, Suspense } from "solid-js"
import { useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"
import { getArtistDataEditArtistPage } from "../data/cache"
import { cacheFetchDictionary } from "../i18n"
import { ArtistFormLayout } from "../layout"

export const route = {
	load: async () => {
		const id = useParams()["id"]
		const artist = await getArtistDataEditArtistPage(id)
		if (!artist) throw redirect("/404")

		const locale = getLocaleCookie()
		void cacheFetchDictionary(locale)
	},
	matchFilters: {
		id: /^\d+$/,
	},
} satisfies RouteDefinition

export default function EditArtistPage() {
	const data = createAsync(async () =>
		getArtistDataEditArtistPage(useParams()["id"])
	)
	const dict = createAsync(async () => cacheFetchDictionary(useI18N().locale()))
	createEffect(() => {
		console.log("locale: ", useI18N().locale())
	})
	return (
		<Suspense>
			<ArtistFormLayout
				data={data}
				dict={dict}
			/>
		</Suspense>
	)
}
