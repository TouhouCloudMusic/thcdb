import { Navigate } from "@tanstack/solid-router"
import { ParentProps, Show } from "solid-js"
import { useUserCtx } from "~/state/user"

export function AuthGuard(props: ParentProps) {
  let user_ctx = useUserCtx()
  return (
    <Show
      when={user_ctx.user}
      fallback={<Navigate to="/" />}
    >
      {props.children}
    </Show>
  )
}
