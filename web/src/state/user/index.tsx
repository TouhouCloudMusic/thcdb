import { createProvider } from "~/utils/createProvider"
import type { SetStoreFunction } from "solid-js/store"
import { Context, createContext, createMemo, ParentProps } from "solid-js"
import { useContextUnsave } from "~/lib/context"

export const enum NotificationState {
  None,
  Unread,
  Muted,
}
export class UserStore {
  constructor(private ctx: UserContext) {}

  get notification_state() {
    if (this.ctx?.config?.mute_notifications === true) {
      return NotificationState.Muted
    } else if ((this.ctx?.notifications.length ?? 0) > 0) {
      return NotificationState.Unread
    } else {
      return NotificationState.None
    }
  }
  get user() {
    if (this.ctx) {
      return this.ctx.user
    }
  }
}

export type User = {
  name: string
  avatar_url: string
}
export type UserContext =
  | {
      user: User
      notifications: unknown[]
      config?: UserConfig
    }
  | undefined

export type UserConfig = {
  mute_notifications: boolean
}

const USER_CONTEXT = createContext<() => UserStore>()

export const useUserCtx = () => useContextUnsave(USER_CONTEXT)()

export function UserContextProvider(
  props: ParentProps & {
    ctx: UserContext
  },
) {
  const state = createMemo(() => new UserStore(props.ctx))
  return (
    <USER_CONTEXT.Provider value={state}>
      {props.children}
    </USER_CONTEXT.Provider>
  )
}
