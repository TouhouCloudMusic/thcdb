import type { PaginatedDiscography } from "../gen"

export type * from "./artist"
export type Discography = PaginatedDiscography["items"][number]
