import { createFileRoute } from "@tanstack/solid-router"
import { UploadAvatarFormContent } from "~/views/user/EditProfile"

export const Route = createFileRoute("/(user)/test_avatar_upload")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <UploadAvatarFormContent />
    </div>
  )
}
