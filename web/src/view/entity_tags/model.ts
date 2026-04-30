import type { CursorResponseTagAggregate, Score, Tag } from "~/hey-api"

export type EntityTaggableType = "artist" | "release" | "song"

export type EntityTagVoteValue = Score

export type EntityTagVoteOption = {
	value: EntityTagVoteValue
	userVote: -3 | 1 | 2 | 3
}

export const ENTITY_TAG_VOTE_OPTIONS: EntityTagVoteOption[] = [
	{
		value: "High",
		userVote: 3,
	},
	{
		value: "Medium",
		userVote: 2,
	},
	{
		value: "Low",
		userVote: 1,
	},
	{
		value: "Veto",
		userVote: -3,
	},
]

export type EntityTagAggregate = CursorResponseTagAggregate["items"][number]

export function sortEntityTags(tags: EntityTagAggregate[]) {
	return [...tags].sort((left, right) => {
		if (left.relevance !== right.relevance) {
			return right.relevance - left.relevance
		}
		if (left.count !== right.count) {
			return right.count - left.count
		}
		return left.name.localeCompare(right.name)
	})
}

export function createEntityTagFilter(selectedTags: { id: number }[]) {
	const selectedIds = new Set<number>(selectedTags.map((tag) => tag.id))

	return (candidate: Tag) => !selectedIds.has(candidate.id)
}

export function scoreFromUserVote(
	value: number | null | undefined,
): EntityTagVoteValue | undefined {
	if (value === -3) return "Veto"
	if (value === 1) return "Low"
	if (value === 2) return "Medium"
	if (value === 3) return "High"
}
