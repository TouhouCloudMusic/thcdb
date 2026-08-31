import { tw } from "~/utils"

export const RELEASES_LIMIT = 6
export const ARTISTS_LIMIT = 6
export const TAGS_LIMIT = 6
export const EVENTS_LIMIT = 6

// The 10rem floor keeps cards readable, while 25% plus the gap caps the grid at three columns.
export const HOME_ENTITY_GRID_CLASS = tw(`
	grid grid-cols-[repeat(auto-fit,minmax(min(100%,max(10rem,25%)),1fr))] gap-0.5
`)
