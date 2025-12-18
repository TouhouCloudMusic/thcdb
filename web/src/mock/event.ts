import { faker } from "@faker-js/faker"
import type { Event } from "@thc/api"

const EVENT_SHORT_DESCRIPTIONS = [
	"Annual fan convention for doujin music and art.",
	"Live performance showcase with multiple circles.",
	"New releases market with signing session.",
	"Community meetup and afterparty.",
]

const EVENT_LOCATIONS = [
	{ country: "Japan", province: "Tokyo", city: "Tokyo" },
	{ country: "Japan", province: "Osaka", city: "Osaka" },
	{ country: "Japan", province: "Aichi", city: "Nagoya" },
	{ country: "China", province: "Shanghai", city: "Shanghai" },
]

export const createMockEvent = (
	id: number,
	override?: Partial<Event>,
): Event => {
	faker.seed(id)

	const name = faker.company.name()
	const startDate = faker.date.between({
		from: new Date("1995-01-01"),
		to: new Date("2025-12-31"),
	})
	const startDateValue = startDate.toISOString().slice(0, 10)

	const durationDays = faker.number.int({ min: 0, max: 2 })
	const endDate = new Date(startDate)
	endDate.setDate(endDate.getDate() + durationDays)
	const hasEndDate = 0 < durationDays

	const hasShortDescription = 0 !== faker.number.int({ min: 0, max: 2 })
	const shortDescription = hasShortDescription
		? faker.helpers.arrayElement(EVENT_SHORT_DESCRIPTIONS)
		: undefined

	const hasLocation = 0 !== faker.number.int({ min: 0, max: 2 })
	const location = hasLocation
		? faker.helpers.arrayElement(EVENT_LOCATIONS)
		: undefined

	const alternativeNameCount = faker.number.int({ min: 0, max: 2 })
	const alternativeNames =
		0 < alternativeNameCount
			? Array.from({ length: alternativeNameCount }, (_, idx) => ({
					id: faker.number.int({ min: 1, max: 1000 }),
					name: `${name} ${idx + 1}`,
				}))
			: undefined

	return {
		id,
		name,
		start_date: { precision: "Day", value: startDateValue },
		end_date: hasEndDate
			? { precision: "Day", value: endDate.toISOString().slice(0, 10) }
			: undefined,
		short_description: shortDescription,
		location,
		alternative_names: alternativeNames,
		...override,
	}
}

export const createMockEvents = (count: number, startId = 1): Event[] => {
	return Array.from({ length: count }, (_, i) => createMockEvent(startId + i))
}

type ExploreParams = {
	limit: number
	cursor: number
	start_date_from?: string
	start_date_to?: string
	sort_direction?: "asc" | "desc"
}

export const createMockPaginatedEvents = (
	params: ExploreParams,
): { items: Event[]; next_cursor: number | null } => {
	const { limit, cursor, start_date_from, start_date_to, sort_direction } =
		params
	const MOCK_TOTAL = 100

	let allEvents = createMockEvents(MOCK_TOTAL, 1)

	if (start_date_from) {
		allEvents = allEvents.filter((event) => {
			const value = event.start_date?.value
			return value ? value >= start_date_from : false
		})
	}

	if (start_date_to) {
		allEvents = allEvents.filter((event) => {
			const value = event.start_date?.value
			return value ? value <= start_date_to : false
		})
	}

	allEvents.sort((a, b) => {
		const aValue = a.id
		const bValue = b.id
		return "desc" === sort_direction ? bValue - aValue : aValue - bValue
	})

	const startIdx = cursor
	const endIdx = Math.min(cursor + limit, allEvents.length)
	const items = allEvents.slice(startIdx, endIdx)
	const nextCursor = endIdx < allEvents.length ? endIdx : null

	return {
		items,
		next_cursor: nextCursor,
	}
}
