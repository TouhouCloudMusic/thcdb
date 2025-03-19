import { createContext, type ParentProps } from "solid-js"
import { createMutable } from "solid-js/store"
import { useContextUnsave } from "~/lib/context"
import { type UserProfile } from "~/model/user"

export const enum NotificationState {
  None,
  Unread,
  Muted,
}
export class UserStore {
  constructor(private ctx: UserContext) {
    return createMutable(this)
  }

  get notification_state() {
    if (this.ctx?.config?.mute_notifications === true) {
      return NotificationState.Muted
    } else if ((this.ctx?.notifications?.length ?? 0) > 0) {
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

  get is_signed_in() {
    return this.user !== undefined
  }

  sign_in(ctx: UserContext) {
    this.ctx = ctx
  }

  sign_out() {
    this.ctx = undefined
  }
}

export type User = {
  name: string
  avatar_url: string
}
export type UserContext =
  | {
      user: UserProfile
      notifications?: unknown[]
      config?: UserConfig
    }
  | undefined

export type UserConfig = {
  mute_notifications: boolean
}

const USER_CONTEXT = createContext<UserStore>()

export const use_user_ctx = () => useContextUnsave(USER_CONTEXT)

export function UserContextProvider(
  props: ParentProps & {
    user: UserContext
  },
) {
  // eslint-disable-next-line solid/reactivity
  let store = new UserStore(props.user)
  return (
    <USER_CONTEXT.Provider value={store}>
      {props.children}
    </USER_CONTEXT.Provider>
  )
}
