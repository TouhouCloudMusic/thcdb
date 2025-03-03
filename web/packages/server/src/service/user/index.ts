import dayjs from "dayjs"
import { type Cookie, Elysia, error, t } from "elysia"
import { type Session } from "~/database"
import { SessionModel, type SessionValidateResult } from "~/model/session"
import { type UserResult } from "~/user"

export const SESSION_TOKEN_NAME = "session_token"
const COOKIE_OPTION = {
  secrets: ["Hakurei Reimu", "Kirisame Marisa"],
  path: "/" as const,
  httpOnly: true as const,
  secure: import.meta.env.NODE_ENV === "production",
  sameSite: "lax" as const,
}

export const auth_service = new Elysia({ name: "Service.Auth" })
  .state({
    user: undefined,
    session: undefined,
  } as {
    user: UserResult | undefined
    session: Session | undefined
  })
  .model({
    "auth::sign": t.Object({
      username: t.RegExp(/^(?!.*[\p{C}\p{Z}])[\p{L}\p{N}\p{S}_]{1,32}$/u, {
        error: "Invalid username",
      }),
      password: t.String({ minLength: 8, maxLength: 64 }),
    }),
    "auth::session": t.Cookie(
      {
        [SESSION_TOKEN_NAME]: t.String(),
      },
      {
        ...COOKIE_OPTION,
        sign: [SESSION_TOKEN_NAME],
      },
    ),
    "auth::optional_session": t.Cookie(
      {
        [SESSION_TOKEN_NAME]: t.Optional(t.String()),
      },
      {
        ...COOKIE_OPTION,
        sign: [SESSION_TOKEN_NAME],
      },
    ),
  })
  // eslint-disable-next-line @typescript-eslint/unbound-method
  .macro(({ onBeforeHandle, onError }) => ({
    isSignIn(enabled: boolean) {
      if (!enabled) return
      onBeforeHandle(async ({ error, cookie, store }) => {
        const token = cookie[SESSION_TOKEN_NAME].value
        if (!token) {
          return error(401)
        }

        const session_validate_result =
          store.user && store.session ?
            ({
              user: store.user,
              session: store.session,
            } as SessionValidateResult)
          : await SessionModel.validateToken(token)
        if (!session_validate_result) {
          return error(401)
        }

        store.session = session_validate_result.session
        store.user = session_validate_result.user

        resetSessionToken(
          cookie[SESSION_TOKEN_NAME],
          session_validate_result.session.id,
        )
      })
      onError(({ cookie }) => {
        if (!cookie[SESSION_TOKEN_NAME].value) return error(401)
      })
    },
  }))

export const auth_guard = new Elysia()
  .use(auth_service)
  .guard({
    isSignIn: true,
    cookie: "auth::session",
  })
  .state((store) => ({
    user: store.user!,
    session: store.session!,
  }))
  .as("plugin")

export function resetSessionToken(
  token: Cookie<string | undefined>,
  value: string,
) {
  token.set({
    value: value,
    maxAge: dayjs().add(30, "day").diff(dayjs(), "second"),
  })
}
