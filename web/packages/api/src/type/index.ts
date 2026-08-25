import type {
	CursorResponseDiscography,
	CursorResponseSimpleRelease,
} from "../gen"

export type * from "./artist"
export type Discography = CursorResponseDiscography["items"][number]
export type SimpleRelease = CursorResponseSimpleRelease["items"][number]
