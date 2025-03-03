import { type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { SiteTitle } from "~/component/site_title"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/page/artist/edit/data"
import { ArtistFormLayout } from "~/page/artist/edit/layout"

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
