import { createFileRoute } from "@tanstack/solid-router"
import { AuthGuard } from "~/components/route"
import { EditProfile } from "~/views/user/EditProfile"

export const Route = createFileRoute("/(user)/profile_/edit")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthGuard>
      <EditProfile />
    </AuthGuard>
  )
}
