import { createFileRoute } from "@tanstack/solid-router"
import type { Event } from "@thc/api"

import { EventInfoPage } from "~/view/event/Info"

export const Route = createFileRoute("/event/mock")({
	component: RouteComponent,
})

const mockData: Event = {
	id: 1,
	name: "博丽神社例大祭 2024",
	short_description: "东方 Project 最大规模线下同人活动。",
	description:
		"博丽神社例大祭是东方 Project 社群每年最期待的庆典，汇聚了音乐、小说、手工艺等各类创作者。\n\n今年特别企划包括东方音乐舞台、主题讲座以及角色游行，让参与者在一整天的活动中沉浸于幻想乡的世界。",
	start_date: {
		value: "2024-05-05",
		precision: "Day",
	},
	end_date: {
		value: "2024-05-05",
		precision: "Day",
	},
	alternative_names: [
		{
			id: 1,
			name: "博麗神社例大祭 第21回",
		},
		{
			id: 2,
			name: "Hakurei Shrine Reitaisai 2024",
		},
	],
}

function RouteComponent() {
	return <EventInfoPage event={mockData} />
}
