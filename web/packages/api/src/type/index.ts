import type { CursorResponseDiscography } from "../gen"

export type * from "./artist"
export type * from "./image_queue"
export type * from "./notification"
export type Discography = CursorResponseDiscography["items"][number]
