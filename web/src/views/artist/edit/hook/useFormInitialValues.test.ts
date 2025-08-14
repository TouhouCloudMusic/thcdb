// oxlint-disable no-magic-numbers
import fc from "fast-check"
import { describe, it, expect } from "vitest"

import type { Artist } from "~/api/artist"

import { useArtistFormInitialValues } from "./useFormInitialValues"

const datePrecisionArb = fc.constantFrom("Day", "Month", "Year")

const dateWithPrecisionOutArb = fc.record({
	// Use a safe date range to avoid Invalid time value
	value: fc
		.date({
			min: new Date(2000, 0, 1),
			max: new Date(2024, 11, 30),
		})
		.map((x) => {
			if (Number.isNaN(x.getTime())) {
				// 如果无效，返回一个默认的有效日期
				return new Date(2000, 0, 1).toISOString()
			}
			return x.toISOString()
		}),

	precision: datePrecisionArb,
})

// oxlint-disable-next-line no-useless-undefined
const opt = <T>(arb: fc.Arbitrary<T>) => fc.oneof(fc.constant(undefined), arb)

const locationArb = fc.record({
	country: opt(fc.string()),
	province: opt(fc.string()),
	city: opt(fc.string()),
})

const membershipArb = fc.record({
	artist_id: fc.integer({ min: 1 }),
	roles: opt(
		fc.array(fc.record({ id: fc.integer({ min: 1 }), name: fc.string() })),
	),
	tenure: opt(
		fc.array(
			fc.record({
				join_year: opt(fc.integer()),
				leave_year: opt(fc.integer()),
			}),
		),
	),
})

const localizedNameArb = fc.record({
	language: fc.record({
		id: fc.integer({ min: 1 }),
		name: fc.string(),
		code: fc.string(),
	}),
	name: fc.string(),
})

const artistArb: fc.Arbitrary<Artist> = fc.record({
	id: fc.integer({ min: 1 }),
	name: fc.string(),
	artist_type: fc.constantFrom("Solo", "Multiple", "Unknown"),
	localized_names: opt(fc.array(localizedNameArb)),
	aliases: opt(fc.array(fc.integer({ min: 1 }))),
	text_aliases: opt(fc.array(fc.string())),
	start_date: opt(dateWithPrecisionOutArb),
	end_date: opt(dateWithPrecisionOutArb),
	links: opt(fc.array(fc.string())),
	start_location: opt(locationArb),
	current_location: opt(locationArb),
	memberships: opt(fc.array(membershipArb)),
})

describe("useArtistFormInitialValues", () => {
	it("returns correct initial values for new artist", () => {
		const result = useArtistFormInitialValues({ type: "new" })

		expect(result).toEqual({
			type: "Create",
			description: "",
			data: {
				name: "",
				artist_type: "Unknown",
				localized_names: [],
				aliases: [],
				text_aliases: [],
				links: [],
				memberships: [],
			},
		})
	})

	it("converts arrays to non-null arrays", () => {
		fc.assert(
			fc.property(artistArb, (artist) => {
				const result = useArtistFormInitialValues({ type: "edit", artist })

				expect(Array.isArray(result.data.localized_names)).toBe(true)
				expect(Array.isArray(result.data.aliases)).toBe(true)
				expect(Array.isArray(result.data.text_aliases)).toBe(true)
				expect(Array.isArray(result.data.links)).toBe(true)
				expect(Array.isArray(result.data.memberships)).toBe(true)
			}),
		)
	})

	it("preserves array lengths when arrays exist", () => {
		fc.assert(
			fc.property(artistArb, (artist) => {
				const result = useArtistFormInitialValues({ type: "edit", artist })

				if (artist.localized_names) {
					expect(result.data.localized_names).toHaveLength(
						artist.localized_names.length,
					)
				}
				if (artist.aliases) {
					expect(result.data.aliases).toHaveLength(artist.aliases.length)
				}
				if (artist.text_aliases) {
					expect(result.data.text_aliases).toHaveLength(
						artist.text_aliases.length,
					)
				}
				if (artist.links) {
					expect(result.data.links).toHaveLength(artist.links.length)
				}
				if (artist.memberships) {
					expect(result.data.memberships).toHaveLength(
						artist.memberships.length,
					)
				}
			}),
		)
	})

	it("converts date strings to Date objects when dates exist", () => {
		fc.assert(
			fc.property(artistArb, (artist) => {
				const result = useArtistFormInitialValues({ type: "edit", artist })

				if (artist.start_date) {
					expect(result.data.start_date?.value).toBeInstanceOf(Date)
					expect(result.data.start_date?.precision).toBe(
						artist.start_date.precision,
					)
				} else {
					expect(result.data.start_date).toBeUndefined()
				}

				if (artist.end_date) {
					expect(result.data.end_date?.value).toBeInstanceOf(Date)
					expect(result.data.end_date?.precision).toBe(
						artist.end_date.precision,
					)
				} else {
					expect(result.data.end_date).toBeUndefined()
				}
			}),
		)
	})

	it("maintains data integrity - no information loss for reversible transformations", () => {
		fc.assert(
			fc.property(artistArb, (artist) => {
				const result = useArtistFormInitialValues({ type: "edit", artist })

				expect(result.data.aliases).toEqual(artist.aliases ?? [])
				expect(result.data.text_aliases).toEqual(artist.text_aliases ?? [])
				expect(result.data.links).toEqual(artist.links ?? [])
			}),
		)
	})
})
