import type { PaginatedDiscography } from "../gen"

export type * from "./artist"
export type * from "./image_queue"
export type * from "./notification"
export type Discography = PaginatedDiscography["items"][number]
