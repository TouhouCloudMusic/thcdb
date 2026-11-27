import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
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
import {
	findArtistByIdOptions,
	uploadArtistProfileImageMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { invalidateAfterImageQueueSubmission } from "~/query/imageQueue"
import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "~/view/image_upload/EntityImageUploadPage"

export const Route = createFileRoute("/artist/$id_/image-upload")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			findArtistByIdOptions({ path: { id: parsedId } }),
		)
		if (data.data === null) {
			throw notFound()
		}
		return data.data
	},
})

function RouteComponent() {
	const { t } = useLingui()
	const { entityId: artistId } = Route.useRouteContext()()
	const query = useQuery(() => ({
		...findArtistByIdOptions({ path: { id: artistId } }),
		throwOnError: true,
	}))
	const uploadMutation = useMutation(uploadArtistProfileImageMutation)
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const navigate = useNavigate()
	const store = createEntityImageUploadStore({
		submitFailedMessage: t`Submit failed.`,
		onUpload: async ({ file, description }) => {
			const username = userCtx.profile?.name
			const { data: entryId } = await uploadMutation.mutateAsync({
				path: { id: artistId },
				body: { data: file, description },
			})

			invalidateAfterImageQueueSubmission(queryClient, entryId, username)

			await navigate({
				to: "/image-queue/$id",
				params: { id: entryId.toString() },
			})
		},
	})

	return (
		<AuthGuard>
			<Show when={query.data?.data}>
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
