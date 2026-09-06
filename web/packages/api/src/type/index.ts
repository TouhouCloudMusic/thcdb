import type { CursorResponseDiscography } from "../gen"

export type * from "./artist"
export type Discography = CursorResponseDiscography["items"][number]
