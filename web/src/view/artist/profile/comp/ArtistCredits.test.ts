import { describe, expect, it } from "vitest"

import type {
	ArtistSongCredit,
	ArtistSongCreditRelease,
	CreditRoleRef,
} from "~/hey-api"

import { formatCreditRange, groupCreditRanges } from "./ArtistCreditRanges"

function role(id: number, name: string): CreditRoleRef {
	return { id, name }
}

function makeDisc(index: number, name?: string) {
	return { index, name }
}

function track(
	disc: ArtistSongCreditRelease["disc"],
	trackNumber: string,
	releaseId = 1,
): ArtistSongCreditRelease {
	return {
		release_id: releaseId,
		title: "Release",
		release_date: null,
		track_number: trackNumber,
		disc,
	}
}

function song(
	songId: number,
	roles: CreditRoleRef[],
	tracks: ArtistSongCreditRelease[],
): ArtistSongCredit {
	return {
		song_id: songId,
		title: `Song ${songId}`,
		roles,
		primary_release_id: 1,
		releases: tracks,
	}
}

describe("artist credit ranges", () => {
	it("merges roles that cover the same range", () => {
		const ranges = groupCreditRanges(
			[
				song(
					1,
					[role(1, "Arranger")],
					["1", "2", "3", "4"].map((number) => track(null, number)),
				),
				song(
					2,
					[role(2, "Violin")],
					["1", "2", "3", "4"].map((number) => track(null, number)),
				),
				song(
					3,
					[role(3, "Orchestration and string arrangement")],
					["1", "2", "3", "4"].map((number) => track(null, number)),
				),
			],
			1,
		)

		expect(ranges.map((group) => formatCreditRange(group.range))).toStrictEqual(
			["1–4"],
		)
		expect(ranges[0]?.roles.map(({ name }) => name)).toStrictEqual([
			"Arranger",
			"Violin",
			"Orchestration and string arrangement",
		])
	})

	it("keeps each distinct range as a separate row", () => {
		const ranges = groupCreditRanges(
			[
				song(
					1,
					[role(1, "Arranger")],
					[
						track(makeDisc(1), "A2"),
						track(makeDisc(1), "A10"),
						...Array.from({ length: 8 }, (_, index) =>
							track(makeDisc(2), String(index + 1)),
						),
					],
				),
			],
			1,
		)

		expect(ranges.map((group) => formatCreditRange(group.range))).toStrictEqual(
			["1.A2", "1.A10", "2.1–2.8"],
		)
	})

	it("splits non-consecutive tracks into separate ranges", () => {
		const ranges = groupCreditRanges(
			[
				song(
					1,
					[role(1, "Arranger")],
					["1", "2", "3", "5", "6", "7", "8", "9"].map((number) =>
						track(null, number),
					),
				),
			],
			1,
		)

		expect(ranges.map((group) => formatCreditRange(group.range))).toStrictEqual(
			["1–3", "5–9"],
		)
	})

	it("treats null and missing discs as the same single-disc release", () => {
		const ranges = groupCreditRanges(
			[
				song(
					1,
					[role(1, "Arranger")],
					[track(null, "1"), track(undefined, "2"), track(null, "3")],
				),
			],
			1,
		)

		expect(ranges.map((group) => formatCreditRange(group.range))).toStrictEqual(
			["1–3"],
		)
	})

	it("uses only tracks from the song's primary release", () => {
		const ranges = groupCreditRanges(
			[song(1, [role(1, "Arranger")], [track(null, "2"), track(null, "9", 2)])],
			1,
		)

		expect(ranges.map((group) => formatCreditRange(group.range))).toStrictEqual(
			["2"],
		)
	})

	it("merges only exact ranges while preserving different ranges", () => {
		const ranges = groupCreditRanges(
			[
				song(
					1,
					[role(1, "Arranger")],
					["1", "2", "3", "4"].map((number) => track(null, number)),
				),
				song(
					2,
					[role(2, "Violin")],
					["1", "2", "3", "4"].map((number) => track(null, number)),
				),
				song(
					3,
					[role(3, "Producer")],
					["1", "2"].map((number) => track(null, number)),
				),
			],
			1,
		)

		expect(
			ranges.map((group) => [
				formatCreditRange(group.range),
				group.roles.map(({ name }) => name),
			]),
		).toStrictEqual([
			["1–4", ["Arranger", "Violin"]],
			["1–2", ["Producer"]],
		])
	})

	it("formats named discs without changing the track range", () => {
		expect(
			formatCreditRange({
				disc: makeDisc(1, "Bonus"),
				start: "A1",
				end: "A1",
			}),
		).toBe("Bonus.A1")
	})

	it("deduplicates credits while keeping equally named discs separate", () => {
		const arranger = role(1, "Arranger")
		const violin = role(2, "Violin")
		const songs = [
			song(2, [arranger, violin], [track(makeDisc(2, "Live"), "2")]),
			song(
				1,
				[arranger, arranger, violin],
				[
					track(makeDisc(1, "Live"), "1"),
					track(makeDisc(2, "Live"), "1"),
					track(makeDisc(1, "Live"), "1"),
				],
			),
		]

		expect(groupCreditRanges(songs, 1)).toStrictEqual([
			{
				range: { disc: makeDisc(1, "Live"), start: "1", end: "1" },
				roles: [arranger, violin],
			},
			{
				range: { disc: makeDisc(2, "Live"), start: "1", end: "2" },
				roles: [arranger, violin],
			},
		])
	})
})
