import { createFileRoute } from "@tanstack/solid-router"
import { Profile } from "~/views/user/profile"

export const Route = createFileRoute("/(user)/profile_/$username")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Profile />
}
