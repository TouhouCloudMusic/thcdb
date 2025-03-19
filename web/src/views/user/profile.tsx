import { Navigate, useParams } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { type UserProfile } from "~/model/user"
import { use_user_ctx } from "~/state/user"

export function Profile() {
  let params = useParams({ strict: false })()
  let user: UserProfile | undefined
  if (params.username) {
    user = {
      name: params.username,
      roles: [],
    }
  }

  let data = () => {
    if (user) {
      return user
    } else {
      let user_ctx = use_user_ctx()

      return user_ctx.user
    }
  }

  return (
    <Show
      when={data()}
      // TODO: Nav to sign in
      fallback={<Navigate to="/" />}
    >
      {(user) => <div>{user().name}</div>}
    </Show>
  )
}
