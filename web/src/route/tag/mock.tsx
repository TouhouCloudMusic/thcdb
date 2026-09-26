import { createFileRoute } from "@tanstack/solid-router"
import type { CorrectionHistoryItem, Tag } from "@thc/api"
import { createSignal } from "solid-js"

import type { EntityUserCollectionSort } from "~/hey-api"
import { TagInfoPage } from "~/view/tag/Info"
import type { TagEntitySort } from "~/view/tag/Info"
import type { TagResultsStore } from "~/view/tag/Info/results"

export const Route = createFileRoute("/tag/mock")({
	component: RouteComponent,
})

const mockData: Tag = {
	id: 101,
	name: "Touhou Arrangement",
	type: "Genre",
	short_description: "Arrangement works related to Touhou Project",
	description:
		"This tag is used for music works arranged from or inspired by Touhou Project original soundtracks.",
	alt_names: [
		{ id: 1, name: "東方アレンジ" },
		{ id: 2, name: "东方编曲" },
	],
	relations: [
		{
			tag: { id: 201, name: "Doujin", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 202, name: "Game Music", type: "Descriptor" },
			type: "Derive",
		},
	],
}

const mockCorrectionHistory: CorrectionHistoryItem[] = [
	{
		id: 1,
		type: "Create",
		created_at: "2026-03-27T09:15:00.000Z",
		handled_at: "2026-03-27T09:45:00.000Z",
		author: { id: 1, name: "Kirisame Marisa" },
		description: "Created the initial tag entry.",
	},
]

const EMPTY_RESULTS: TagResultsStore<never> = {
	data: { items: [], page: 1, total_pages: 0 },
	status: "success",
	setPage: () => undefined,
}

function RouteComponent() {
	const [sortBy, setSortBy] =
		createSignal<EntityUserCollectionSort>("collected_at")
	const [entitySort, setEntitySort] = createSignal<TagEntitySort>("popular")
	return (
		<TagInfoPage
			tag={mockData}
			correctionHistory={mockCorrectionHistory}
			releases={{
				...EMPTY_RESULTS,
				get sortBy() {
					return entitySort()
				},
				setSortBy: setEntitySort,
			}}
			songs={{
				...EMPTY_RESULTS,
				get sortBy() {
					return entitySort()
				},
				setSortBy: setEntitySort,
			}}
			collections={{
				...EMPTY_RESULTS,
				get sortBy() {
					return sortBy()
				},
				setSortBy,
			}}
		/>
	)
}
