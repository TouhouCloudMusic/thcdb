import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import {
	AVATAR_MAX_FILE_SIZE,
	AVATAR_MIN_FILE_SIZE,
	RELEASE_COVER_IMAGE_MAX_HEIGHT,
	RELEASE_COVER_IMAGE_MAX_WIDTH,
	RELEASE_COVER_IMAGE_MIN_HEIGHT,
	RELEASE_COVER_IMAGE_MIN_WIDTH,
} from "~/constant/server"
import {
	findReleaseByIdOptions,
	uploadReleaseCoverArtMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { invalidateAfterImageQueueSubmission } from "~/query/imageQueue"
import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "~/view/image_upload/EntityImageUploadPage"

export const Route = createFileRoute("/release/$id_/image-upload")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			findReleaseByIdOptions({ path: { id: parsedId } }),
		)
		if (data.data === null) {
			throw notFound()
		}
		return data.data
	},
})

function RouteComponent() {
	const { t } = useLingui()
	const { entityId: releaseId } = Route.useRouteContext()()
	const query = useQuery(() => ({
		...findReleaseByIdOptions({ path: { id: releaseId } }),
		throwOnError: true,
	}))
	const uploadMutation = useMutation(uploadReleaseCoverArtMutation)
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const navigate = useNavigate()
	const store = createEntityImageUploadStore({
		submitFailedMessage: t`Submit failed.`,
		onUpload: async ({ file, description }) => {
			const username = userCtx.profile?.name
			const { data: entryId } = await uploadMutation.mutateAsync({
				path: { id: releaseId },
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
				{(release) => (
					<EntityImageUploadPage
						entityLabel="Release"
						entityId={releaseId.toString()}
						entityName={release().title}
						imageLabel={t`cover art`}
						imageUrl={release().cover_art_url}
						dimensionRange={{
							width: {
								min: RELEASE_COVER_IMAGE_MIN_WIDTH,
								max: RELEASE_COVER_IMAGE_MAX_WIDTH,
							},
							height: {
								min: RELEASE_COVER_IMAGE_MIN_HEIGHT,
								max: RELEASE_COVER_IMAGE_MAX_HEIGHT,
							},
						}}
						fileSizeRange={{
							min: AVATAR_MIN_FILE_SIZE,
							max: AVATAR_MAX_FILE_SIZE,
						}}
						store={store}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
