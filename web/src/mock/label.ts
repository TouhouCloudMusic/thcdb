import { faker } from "@faker-js/faker"
import type { Label } from "@thc/api"

const LANG_JA = { id: 1, code: "ja", name: "Japanese" } as const

export const createMockLabel = (
	id: number,
	override?: Partial<Label>,
): Label => {
	faker.seed(id)

	const foundedDate = faker.date.between({
		from: new Date("1990-01-01"),
		to: new Date("2020-12-31"),
	})
	const foundedDateValue = foundedDate.toISOString().slice(0, 10)

	const dissolved = id % 5 === 0
	const dissolvedDate = dissolved
		? faker.date.between({ from: foundedDate, to: new Date("2025-12-31") })
		: undefined
	const dissolvedDateValue = dissolvedDate?.toISOString().slice(0, 10)

	return {
		id,
		name: faker.company.name(),
		localized_names: [{ language: LANG_JA, name: faker.company.name() }],
		founders: [faker.number.int({ min: 1, max: 1000 })],
		founded_date: { precision: "Day", value: foundedDateValue },
		dissolved_date: dissolvedDateValue
			? { precision: "Day", value: dissolvedDateValue }
			: undefined,
		...override,
	}
}

export const createMockLabels = (count: number, startId = 1): Label[] => {
	return Array.from({ length: count }, (_, i) => createMockLabel(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	founded_date_from?: string
	founded_date_to?: string
	is_dissolved?: boolean
	sort_field?: "created_at" | "handled_at"
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedLabels = (
	params: ExploreParams,
): { items: Label[]; next_cursor: number | null } => {
	const {
		limit,
		cursor,
		founded_date_from,
		founded_date_to,
		is_dissolved,
		sort_field,
		sort_direction,
	} = params

	const MOCK_TOTAL = 120

	let allLabels = createMockLabels(MOCK_TOTAL, 1)

	if (is_dissolved !== undefined) {
		allLabels = allLabels.filter((label) =>
			is_dissolved ? !!label.dissolved_date : !label.dissolved_date,
		)
	}

	if (founded_date_from) {
		allLabels = allLabels.filter((label) => {
			const value = label.founded_date?.value
			return value ? value >= founded_date_from : false
		})
	}

	if (founded_date_to) {
		allLabels = allLabels.filter((label) => {
			const value = label.founded_date?.value
			return value ? value <= founded_date_to : false
		})
	}

	if (sort_field) {
		allLabels.sort((a, b) => {
			const aValue = a.id
			const bValue = b.id
			return sort_direction === "desc" ? bValue - aValue : aValue - bValue
		})
	}

	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allLabels.length)
	const items = allLabels.slice(startIdx, endIdx)
	const nextCursor = endIdx < allLabels.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}
