import { t } from "elysia"

export const link_artist = t.Object({ id: t.Number(), name: t.String() })
export type LinkArtist = typeof link_artist.static

export const link_label = t.Object({ id: t.Number(), name: t.String() })
export type LinkLabel = typeof link_label.static

export const link_release = t.Object({ id: t.Number(), title: t.String() })
export type LinkRelease = typeof link_release.static
