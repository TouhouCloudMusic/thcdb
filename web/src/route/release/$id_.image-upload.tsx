import { useLingui } from "@lingui/solid/macro"
import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { ReleaseMutation, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
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
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "~/view/image_upload/EntityImageUploadPage"

export const Route = createFileRoute("/release/$id_/image-upload")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
})

function RouteComponent() {
	const { t } = useLingui()
	const params = Route.useParams()
	const releaseId = EntityId_fromStr(params().id)
	const query = useQuery(() => ReleaseQueryOption.findById(releaseId))
	const uploadMutation = ReleaseMutation.getUploadCoverArtInstance()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const store = createEntityImageUploadStore({
		submitFailedMessage: t`Submit failed.`,
		onUpload: async (file: File) => {
			const entryId = await uploadMutation.mutateAsync({ id: releaseId, file })

			void queryClient.invalidateQueries({
				queryKey: ["release::info", releaseId],
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
