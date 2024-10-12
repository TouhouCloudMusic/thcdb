import { Elysia, t } from "elysia"
import { Session, User } from "~/database"
export const auth_service = new Elysia({ name: "Service.Auth" })
  .state({
    user: {} as User,
    session: {} as Session,
  })
  .model({
    "auth::sign_in": t.Object({
      username: t.RegExp(/^(?!.*[\p{C}\p{Z}])[\p{L}\p{N}\p{S}_]{1,16}$/u),
      password: t.String({ minLength: 8, maxLength: 64 }),
    }),
    "auth::session": t.Cookie(
      {
        token: t.String({
          format: "uuid",
        }),
      },
      {
        secrets: "阿巴阿巴",
      },
    ),
  })
  .model((model) => {
    return {
      ...model,
      "auth::optional_session": t.Partial(model["auth::session"]),
    }
  })
  .macro(({ onBeforeHandle }) => ({
    isSignIn(enabled: true) {
      if (!enabled) return
      onBeforeHandle(({ error, cookie, store: { user } }) => {
        if (!cookie.token.value) {
          return error(401, {
            success: false,
            message: "Unauthorized",
          })
        }

        const username = user.name

        if (!username) {
          return error(401, {
            success: false,
            message: "Unauthorized",
          })
        }
      })
    },
  }))

export const user_info = new Elysia()
  .use(auth_service)
  .guard({
    isSignIn: true,
    cookie: "auth::session",
  })
  .resolve(({ store: { user } }) => ({
    username: user.name,
  }))
  .as("plugin")
