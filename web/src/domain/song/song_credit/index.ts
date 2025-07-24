import type { SimpleArtist } from "~/api/artist"
import type { CreditRole } from "~/api/credit"

export * as SongCreditStatics from "./__internal"

export type GroupedSongCredit = { artist: SimpleArtist; roles: CreditRole[] }
