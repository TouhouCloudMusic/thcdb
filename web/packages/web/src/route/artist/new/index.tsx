import { type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { SiteTitle } from "~/components/site_title"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/views/artist/edit/data"
import { ArtistFormLayout } from "~/views/artist/edit/layout"

export const route = {
  preload: async () => {
    const client = useQueryClient()
    void Query.prefetchDict(await preloadLocale(), client)
  },
} satisfies RouteDefinition

export default function AddArtistPage() {
  return (
    <>
      <SiteTitle>New Artist</SiteTitle>
      <ArtistFormLayout />
    </>
  )
}
