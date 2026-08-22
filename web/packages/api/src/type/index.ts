import type {
	CursorResponseDiscography,
	CursorResponseSimpleRelease,
} from "../gen"

export type * from "./artist"
export type * from "./image_queue"
export type Discography = CursorResponseDiscography["items"][number]
export type SimpleRelease = CursorResponseSimpleRelease["items"][number]
