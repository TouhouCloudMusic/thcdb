import { t } from "@lingui/core/macro"
import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { ArtistMutation, ArtistQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import {
	ARTIST_PROFILE_IMAGE_MAX_FILE_SIZE,
	ARTIST_PROFILE_IMAGE_MAX_HEIGHT,
	ARTIST_PROFILE_IMAGE_MAX_WIDTH,
	ARTIST_PROFILE_IMAGE_MIN_HEIGHT,
	ARTIST_PROFILE_IMAGE_MIN_WIDTH,
	AVATAR_MIN_FILE_SIZE,
} from "~/constant/server"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "~/view/image_upload/EntityImageUploadPage"

export const Route = createFileRoute("/artist/$id_/image-upload")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			ArtistQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const artistId = EntityId_fromStr(params().id)
	const query = useQuery(() => ArtistQueryOption.findById(artistId))
	const uploadMutation = ArtistMutation.getUploadProfileImageInstance()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const store = createEntityImageUploadStore({
		onUpload: async (file: File) => {
			const entryId = await uploadMutation.mutateAsync({ id: artistId, file })

			void queryClient.invalidateQueries({
				queryKey: ["artist::profile", artistId],
			})
			void queryClient.invalidateQueries({ queryKey: ["image-queue::list"] })
			void queryClient.invalidateQueries({
				queryKey: ["image-queue::pending-count"],
			})
			void queryClient.invalidateQueries({ queryKey: ["image-queue::user"] })

			await navigate({
				to: "/image-queue/$id",
				params: { id: entryId.toString() },
			})
		},
	})

	return (
		<AuthGuard>
			<Show when={query.data && O.getOrUndefined(query.data)}>
				{(artist) => (
					<EntityImageUploadPage
						entityLabel="Artist"
						entityId={artistId.toString()}
						entityName={artist().name}
						imageLabel={t`profile image`}
						imageUrl={artist().profile_image_url}
						dimensionRange={{
							width: {
								min: ARTIST_PROFILE_IMAGE_MIN_WIDTH,
								max: ARTIST_PROFILE_IMAGE_MAX_WIDTH,
							},
							height: {
								min: ARTIST_PROFILE_IMAGE_MIN_HEIGHT,
								max: ARTIST_PROFILE_IMAGE_MAX_HEIGHT,
							},
						}}
						fileSizeRange={{
							min: AVATAR_MIN_FILE_SIZE,
							max: ARTIST_PROFILE_IMAGE_MAX_FILE_SIZE,
						}}
						store={store}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
