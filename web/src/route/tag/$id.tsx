import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { batch, createSignal, Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import type { EntityUserCollectionSort } from "~/hey-api"
import {
	entityUserCollectionsOptions,
	entityCorrectionsOptions,
	findTagByIdOptions,
	findTagEntitiesOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { TagInfoPage } from "~/view/tag/Info"
import type { TagEntitySort } from "~/view/tag/Info"

const TAG_ENTITY_PAGE_LIMIT = 5

export const Route = createFileRoute("/tag/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		const [tag] = await Promise.all([
			QUERY_CLIENT.ensureQueryData(
				findTagByIdOptions({ path: { id: parsedId } }),
			),
			QUERY_CLIENT.ensureQueryData(
				entityCorrectionsOptions({
					path: { entity_type: "tag", id: parsedId },
				}),
			),
		])
		if (!tag.data) {
			throw notFound()
		}
		return tag.data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const tagId = () => EntityId_fromStr(params().id)

	const query = useQuery(() => findTagByIdOptions({ path: { id: tagId() } }))
	const correctionHistoryQuery = useQuery(() =>
		entityCorrectionsOptions({
			path: { entity_type: "tag", id: tagId() },
		}),
	)

	const [releasePage, setReleasePage] = createSignal(1)
	const [releaseSort, setReleaseSort] = createSignal<TagEntitySort>("popular")
	const releasesQuery = useQuery(() =>
		findTagEntitiesOptions({
			path: { id: tagId() },
			query: {
				entity_type: "release",
				sort_by: releaseSort(),
				limit: TAG_ENTITY_PAGE_LIMIT,
				page: releasePage(),
			},
		}),
	)
	const releases = {
		get status() {
			return releasesQuery.status
		},
		get data() {
			const result = releasesQuery.data?.data
			return result?.entity_type === "release" ? result.page : undefined
		},
		setPage: setReleasePage,
		get sortBy() {
			return releaseSort()
		},
		setSortBy: (sort: TagEntitySort) =>
			batch(() => {
				setReleaseSort(sort)
				setReleasePage(1)
			}),
	}

	const [songPage, setSongPage] = createSignal(1)
	const [songSort, setSongSort] = createSignal<TagEntitySort>("popular")
	const songsQuery = useQuery(() =>
		findTagEntitiesOptions({
			path: { id: tagId() },
			query: {
				entity_type: "song",
				sort_by: songSort(),
				limit: TAG_ENTITY_PAGE_LIMIT,
				page: songPage(),
			},
		}),
	)
	const songs = {
		get status() {
			return songsQuery.status
		},
		get data() {
			const result = songsQuery.data?.data
			return result?.entity_type === "song" ? result.page : undefined
		},
		setPage: setSongPage,
		get sortBy() {
			return songSort()
		},
		setSortBy: (sort: TagEntitySort) =>
			batch(() => {
				setSongSort(sort)
				setSongPage(1)
			}),
	}

	const [collectionPage, setCollectionPage] = createSignal(1)
	const [collectionSort, setCollectionSort] =
		createSignal<EntityUserCollectionSort>("collected_at")
	const collectionsQuery = useQuery(() =>
		entityUserCollectionsOptions({
			path: { entity_type: "tag", id: tagId() },
			query: {
				limit: TAG_ENTITY_PAGE_LIMIT,
				page: collectionPage(),
				sort_by: collectionSort(),
			},
		}),
	)
	const collections = {
		get status() {
			return collectionsQuery.status
		},
		get data() {
			return collectionsQuery.data?.data
		},
		get sortBy() {
			return collectionSort()
		},
		setPage: setCollectionPage,
		setSortBy: (sort: EntityUserCollectionSort) =>
			batch(() => {
				setCollectionSort(sort)
				setCollectionPage(1)
			}),
	}

	return (
		<Show when={query.data?.data}>
			{(tag) => (
				<TagInfoPage
					tag={tag()}
					correctionHistory={correctionHistoryQuery.data?.data ?? []}
					releases={releases}
					songs={songs}
					collections={collections}
				/>
			)}
		</Show>
	)
}
