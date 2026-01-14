import type { PaginatedDiscography } from "../gen"

export type * from "./artist"
export type * from "./image_queue"
export type Discography = PaginatedDiscography["items"][number]
