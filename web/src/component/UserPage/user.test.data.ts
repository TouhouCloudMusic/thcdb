import type { TimeLineItem, UserPageData } from "./user.data"

function generator(index: number): TimeLineItem[] {
	const arr: TimeLineItem[] = []
	for (let i = 0; i < index; i++) {
		arr.push({
			user: {
				id: i,
				username: "test user",
			},
			time: `2022-01-${i * 2 > 9 ? i * 2 : `0${i * 2}`} 00:${i * 3 > 9 ? i * 3 : `0${i * 3}`}:${i * 4 > 9 ? i * 4 : `0${i * 4}`}`,
			action_type: "review",
			target_type: "release",
			target_id: i,
			target_data: {
				title: `test release ${i}`,
			},
		})
	}
	return arr
}

const testTimelineData = generator(10)

export const testUserPageData: UserPageData = {
	username: "test user",
	timeline: testTimelineData,
}
