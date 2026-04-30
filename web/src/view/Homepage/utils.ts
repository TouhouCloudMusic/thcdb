import type { Event, Release } from "@thc/api"

import { DateWithPrecision } from "~/domain/shared"

const COUNT_FORMATTER = new Intl.NumberFormat("en-US")

export const formatArtists = (
	artists: { name: string }[] | undefined,
	unknownArtistLabel: string,
) => {
	if (!artists || artists.length === 0) return unknownArtistLabel
	return artists
		.slice(0, 3)
		.map((artist) => artist.name)
		.join(" · ")
}

export const formatCount = (value: number | undefined) => {
	if (value === undefined) return "—"
	return COUNT_FORMATTER.format(value)
}

export const displayReleaseDate = (
	date: Release["release_date"] | null | undefined,
) => {
	return DateWithPrecision.display(date)
}

export const displayEventDate = (event: Event) => {
	const start = event.start_date?.value
	if (!start) return

	const end = event.end_date?.value
	if (!end || start === end) return start
	return `${start} - ${end}`
}

export const formatEventLocation = (event: Event) => {
	const location = event.location
	if (!location) return
	const parts = [location.city, location.province, location.country].filter(
		Boolean,
	)
	return parts.join(", ")
}
