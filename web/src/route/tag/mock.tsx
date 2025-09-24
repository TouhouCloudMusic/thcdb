import { createFileRoute } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"

import { TagInfoPage } from "~/view/tag/Info"

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

function RouteComponent() {
	return <TagInfoPage tag={mockData} />
}
