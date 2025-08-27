import type { SimpleArtist, CreditRoleRef } from "@thc/api"

export * as SongCreditStatics from "./__internal"

export type GroupedSongCredit = { artist: SimpleArtist; roles: CreditRoleRef[] }
