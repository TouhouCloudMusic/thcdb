import { cleanup, render, screen, within } from "@solidjs/testing-library"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import type { SongRelation, SongRelationSummary, SongRelease } from "~/hey-api"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"

import { SongInfoRelations } from "./SongInfoRelations"

function summary(
	id: number,
	title: string,
	songRelease: SongRelationSummary["release"] = null,
): SongRelationSummary {
	return { id, title, artists: [], release: songRelease }
}

function relation(
	song: SongRelationSummary,
	direction: SongRelation["direction"],
): SongRelation {
	return {
		song,
		direction,
		type: "Arrangement",
		description: "",
	}
}

function renderRelations(relations: SongRelation[]) {
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	})

	return render(() => (
		<RouterContextProvider router={router}>
			{() => (
				<I18NProvider initialLocale="en">
					<SongInfoRelations relations={relations} />
				</I18NProvider>
			)}
		</RouterContextProvider>
	))
}

function release(id: number, date: string | null): SongRelease {
	return {
		id,
		title: `Release ${id}`,
		track_positions: [],
		release_date: date ? { value: date, precision: "Day" } : null,
	}
}

function visibleSongTitles() {
	return within(screen.getByRole("list", { name: "Relations" }))
		.getAllByRole("link")
		.filter((link) => link.getAttribute("href")?.startsWith("/song/"))
		.map((link) => link.textContent)
}

describe("song relations", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(cleanup)

	it("sorts by release date and keeps unknown dates last in either direction", async () => {
		expect.hasAssertions()
		renderRelations([
			relation(summary(1, "Unknown date", release(10, null)), "Derived"),
			relation(summary(2, "Later song", release(20, "2020-01-01")), "Derived"),
			relation(
				summary(3, "Earlier song", release(30, "2002-08-11")),
				"Derived",
			),
			relation(summary(4, "Unreleased song"), "Derived"),
		])

		expect(visibleSongTitles()).toStrictEqual([
			"Earlier song",
			"Later song",
			"Unknown date",
			"Unreleased song",
		])
		screen.getByRole("button", { name: /^Release date /u }).focus()
		await userEvent.keyboard("{ArrowRight}")
		expect(visibleSongTitles()).toStrictEqual([
			"Later song",
			"Earlier song",
			"Unknown date",
			"Unreleased song",
		])
	})
})
