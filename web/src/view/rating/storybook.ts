import { createSignal } from "solid-js"

import type { Rating } from "~/hey-api"

import type { EntityRatingModel, EntityRatingState } from "./EntityRating"

type MockEntityRatingOptions = {
	otherRatings?: readonly Rating[]
	userRating?: Rating | null
	status?: EntityRatingState["status"]
}

export function createMockEntityRating(
	options: MockEntityRatingOptions = {},
): EntityRatingModel {
	const [userRating, setUserRating] = createSignal(options.userRating ?? null)

	return {
		state: () => {
			if (options.status === "loading") {
				return { status: "loading" }
			}

			const rating = userRating()
			const ratings = [...(options.otherRatings ?? [])]
			if (rating !== null) ratings.push(rating)

			return {
				status: options.status ?? "ready",
				summary: {
					average:
						ratings.length === 0
							? null
							: ratings.reduce((sum, value) => sum + value, 0) / ratings.length,
					count: ratings.length,
					user_rating: rating,
				},
			}
		},
		setRating: (rating) => {
			setUserRating(rating)
		},
	}
}
