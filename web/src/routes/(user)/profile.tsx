import { createFileRoute } from "@tanstack/solid-router"
import { Profile } from "~/views/user/profile"

export const Route = createFileRoute("/(user)/profile")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Profile />
}
