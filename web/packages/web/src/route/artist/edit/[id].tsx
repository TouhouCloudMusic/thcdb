import { Navigate, useParams, type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { createEffect, on } from "solid-js"
import { SiteTitle } from "~/component/site_title"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/page/artist/edit/data"
import { ArtistFormLayout } from "~/page/artist/edit/layout"

export const route = {
  preload: async ({ params }) => {
    const id = params["id"]
    const client = useQueryClient()
    void Query.prefetchData(id, client)
    void Query.prefetchDict(await preloadLocale(), client)
  },
  matchFilters: {
    id: /^\d+$/,
  },
} satisfies RouteDefinition

export default function EditArtistPage() {
  const id = () => useParams()["id"]
  const dataQuery = Query.fetchData(id)

  createEffect(
    on(
      () => dataQuery.data,
      (data) => {
        if (!data) {
          Navigate({
            href: "/404",
          })
        }
      },
    ),
  )
  return (
    <>
      <SiteTitle>Editing: {dataQuery.data?.name ?? ""}</SiteTitle>
      <ArtistFormLayout dataQuery={dataQuery} />
    </>
  )
}
