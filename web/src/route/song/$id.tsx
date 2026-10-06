import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { produce } from "immer"

import { showErrorToast } from "~/component/toast"
import { EntityId_fromStr } from "~/domain/shared"
import {
	entityCorrectionsOptions,
	findSongByIdOptions,
	setRatingMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import { createEntityVisit } from "~/state/visit"
import type { EntityRatingModel } from "~/view/rating/EntityRating"
import { SongInfoPage } from "~/view/song/Info"

export const Route = createFileRoute("/song/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)

		const [data] = await Promise.all([
			QUERY_CLIENT.ensureQueryData(
				findSongByIdOptions({ path: { id: parsedId } }),
			),
			QUERY_CLIENT.ensureQueryData(
				entityCorrectionsOptions({
					path: { entity_type: "song", id: parsedId },
				}),
			),
		])

		if (data.data === null) {
			throw notFound()
		}

		return data.data
	},

	// Optional: Add error component and pending component as in artist route if desired
	// errorComponent: () => <Navigate to="/" />,
	// pendingComponent: () => <div>Loading song...</div>,
})

function RouteComponent() {
	const { t } = useLingui()
	const user = useCurrentUser()

	const params = Route.useParams()
	const loaderData = Route.useLoaderData()

	const songId = () => EntityId_fromStr(params().id)

	createEntityVisit("song", songId)

	const query = useQuery(() => findSongByIdOptions({ path: { id: songId() } }))

	const saveRating = useMutation(setRatingMutation)

	const rating: EntityRatingModel = {
		state() {
			const summary = query.data?.data?.rating
			if (!summary) return { status: "loading" }

			const status =
				user.session.status === "authenticated"
					? saveRating.isPending
						? "saving"
						: "ready"
					: "readonly"

			return { status, summary }
		},
		setRating(value) {
			const id = songId()

			saveRating.mutate(
				{ path: { target_type: "song", id }, body: { rating: value } },
				{
					onSuccess: (response) =>
						QUERY_CLIENT.setQueryData(
							findSongByIdOptions({ path: { id } }).queryKey,
							(data) =>
								produce(data, (draft) => {
									if (draft?.data) draft.data.rating = response.data
								}),
						),
					onError: () => {
						saveRating.reset()
						showErrorToast({ title: t`Could not update rating` })
					},
				},
			)
		},
	}

	const correctionHistoryQuery = useQuery(() =>
		entityCorrectionsOptions({
			path: { entity_type: "song", id: songId() },
		}),
	)

	return (
		<SongInfoPage
			song={query.data?.data ?? loaderData()}
			correctionHistory={correctionHistoryQuery.data?.data ?? []}
			rating={rating}
		/>
	)
}
