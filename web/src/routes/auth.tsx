import { createFileRoute } from "@tanstack/solid-router"
import { Auth } from "~/views/auth"

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Auth />
}
