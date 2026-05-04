import { Trans } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { EntityId_fromStr } from "~/domain/shared"
import { findSongLyricsByIdOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { QUERY_CLIENT } from "~/state/tanstack"

export const Route = createFileRoute("/song-lyrics/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const id = EntityId_fromStr(params.id)
		const data = await QUERY_CLIENT.ensureQueryData(
			findSongLyricsByIdOptions({ path: { id } }),
		)
		if (data.data === null) {
			throw notFound()
		}
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = () => EntityId_fromStr(params().id)
	const query = useQuery(() =>
		findSongLyricsByIdOptions({ path: { id: id() } }),
	)

	return (
		<Show when={query.data?.data}>
			{(lyrics) => (
				<PageLayout class="p-8">
					<main class="space-y-6">
						<header class="space-y-2">
							<h1 class="text-2xl font-light tracking-tight text-primary">
								<Trans>Song lyrics</Trans>
							</h1>
							<p class="text-sm text-tertiary">
								<Link
									to="/song/$id"
									params={{ id: lyrics().song_id.toString() }}
								>
									<Trans>Song</Trans>
								</Link>
								{" · "}
								{lyrics().language.name}
							</p>
						</header>

						<pre class="whitespace-pre-wrap text-sm leading-6 text-secondary">
							{lyrics().content}
						</pre>
					</main>
				</PageLayout>
			)}
		</Show>
	)
}
