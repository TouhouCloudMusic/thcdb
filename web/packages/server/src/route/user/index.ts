import { verify } from "@node-rs/argon2"
import { hash, myEffect } from "@touhouclouddb/utils"
import dayjs from "dayjs"
import { Effect } from "effect"
import { Cookie, Elysia, } from "elysia"
import { Session, User } from "~/database"
import { Response } from "~/lib/response"
import { UserModel } from "~/model/user"
import { SessionModel } from "~/model/user/session"
import { auth_service, user_info } from "~/service/user"

function updateSessionState({
  user,
  session,
  store,
  token,
}: {
  user: User
  session: Session
  store: {
    user: User
    session: Session
  }
  token: Cookie<string | undefined>
}) {
  store.user = user
  store.session = session
  token.set({
    value: session.id,
    maxAge: dayjs().add(30, "day").diff(dayjs(), "second"),
  })
}

export const user_router = new Elysia()
  .use(auth_service)
  .post(
    "/sign-up",
    async ({ body: { username, password }, store, cookie: { token } }) => {
      return UserModel.existM(username).pipe(
        Effect.bindTo("exist"),
        myEffect.flatMap((x) =>
          x.exist ?
            Effect.fail("User already exists" as const)
          : Effect.succeed(x),
        ),
        Effect.bind("password", () => Effect.promise(() => hash(password))),
        Effect.bind("user", ({ password }) =>
          UserModel.insertM({ name: username, password: password }),
        ),
        myEffect.bind("session", SessionModel.createSessionM),
        Effect.tap((info) => updateSessionState({ ...info, store, token })),
        Effect.match({
          onSuccess: ({ user }) => Response.hello(user.name),
          onFailure: (err) => {
            if (err === "User already exists") return Response.err(409, err)
            else return Response.err(500, err)
          },
        }),
        Effect.runPromise,
      )
    },
    {
      body: "auth::sign_in",
    },
  )
  .post(
    "/sign-in",
    async ({ store, body: { username, password }, cookie: { token } }) => {
      if (store.user.name && token)
        return Response.err(409, "Already signed in")

      const check_session_by_token =
        token.value ?
          await SessionModel.validateToken({
            token: token.value,
          })
        : undefined
      if (check_session_by_token)
        return Response.hello(check_session_by_token.user.name)

      const result = await UserModel.findByNameWithSession(username)
      if (!result) return Response.err(404, "User not found")

      const { session, ...user } = result

      if (!(await verify(user.password, password))) {
        return Response.err(401, "Incorrect password")
      }

      let new_session = session

      if (!(session as unknown as Nilable<Session>)) {
        new_session = await SessionModel.createSession(
          SessionModel.generateSessionToken(),
          user.id,
        )
      }

      updateSessionState({
        user,
        session: new_session,
        store,
        token,
      })

      token.set({
        value: new_session.id,
        maxAge: dayjs().add(30, "day").diff(dayjs(), "second"),
        sameSite: "lax",
        path: "/",
      })

      return Response.hello(user.name)
    },
    {
      body: "auth::sign_in",
      cookie: "auth::optional_session",
    },
  )
  .use(user_info)
  .get(
    "/sign-out",
    async ({ cookie: { token } }) => {
      await SessionModel.invalidateSession(token.value)
      token.remove()

      return Response.ok("Signed out")
    },
    // {
    //   cookie: "auth::session",
    // },
  )
  .get(
    "/profile",
    ({ store: { user } }) => {
      return Response.ok(user)
    },
    {
      isSignIn: true,
      cookie: "auth::session",
    },
  )
