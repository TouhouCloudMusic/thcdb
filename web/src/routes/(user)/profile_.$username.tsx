import { createFileRoute, notFound } from "@tanstack/solid-router"
import { userProfileQuery, userProfileQueryOption } from "~/data/user"
import { TanstackQueryClinet } from "~/state/tanstack"
import { Profile } from "~/views/user/Profile"

export const Route = createFileRoute("/(user)/profile_/$username")({
  component: RouteComponent,
  loader: ({ params: { username } }) =>
    TanstackQueryClinet.ensureQueryData(
      userProfileQueryOption({
        "params.username": username,
      }),
    ),
})

function RouteComponent() {
  return <Profile />
}
