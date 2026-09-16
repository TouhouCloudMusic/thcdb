import type { Location } from "~/domain/shared"

export * from "./schema"

export function formatEventLocation(location: Location | null | undefined) {
	if (!location) return

	const parts = [location.city, location.province, location.country].filter(
		Boolean,
	)
	return parts.length > 0 ? parts.join(", ") : undefined
}
