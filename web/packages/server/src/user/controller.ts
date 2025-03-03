import { verify } from "@node-rs/argon2"
import { hash } from "@touhouclouddb/utils"
import { Effect, Either } from "effect"
import { UnknownException } from "effect/Cause"
import { Elysia, error, redirect, t } from "elysia"
import { Response } from "~/lib/response"
import { ImageModel } from "~/model/image"
import { SessionModel } from "~/model/session"
import { auth_guard, auth_service, resetSessionToken } from "~/service/user"
import { user_model } from "../model/user"
import { AVATAR_EXTENSION_NAME, validateAvatar } from "./utils"

const AUTH_FAILED_MSG = "Incorrect username or password"
const ALREADY_SIGNED_IN = "Already signed in"
const ALREADY_SIGNED_IN_RESPONSE = Response.err(409, ALREADY_SIGNED_IN)
export const user_controller = new Elysia()
  .use(auth_service)
  .use(user_model)
  .post(
    "/sign-up",
    async ({
      UserModel,
      body: { username, password },
      store,
      cookie: { session_token: token },
    }) => {
      if (token.value) return ALREADY_SIGNED_IN_RESPONSE

      return Effect.gen(function* () {
        const exist = yield* UserModel.existM(username)

        yield* exist ?
          Effect.fail("User already exists" as const)
        : Effect.succeed(0)

        const hashed_password = yield* Effect.promise(() => hash(password))

        const { id } = yield* UserModel.createM({
          name: username,
          password: hashed_password,
        })

        const user = (yield* UserModel.findByIdM(id))!
        const session = yield* SessionModel.createM(id)

        store.user = user
        store.session = session

        resetSessionToken(token, session.id)

        return user.name
      }).pipe(
        Effect.match({
          onSuccess: Response.hello,
          onFailure: (err) => {
            if (err instanceof UnknownException) throw new Error(err.message)
            if (err === "User already exists") return Response.err(409, err)
            else return Response.err(500, err)
          },
        }),
        Effect.runPromise,
      )
    },
    {
      body: "auth::sign",
      response: {
        200: Response.ok.schema(t.String()),
        409: Response.err.schema,
        500: Response.err.schema,
      },
      cookie: "auth::optional_session",
    },
  )
  .post(
    "/sign-in",
    async ({
      store,
      UserModel,
      body: { username, password },
      cookie: { session_token: token },
    }) => {
      if (token.value) return ALREADY_SIGNED_IN_RESPONSE

      const task = Effect.gen(function* () {
        const validated_token =
          token.value ?
            yield* SessionModel.validateTokenM({
              token: token.value,
            })
          : null

        if (validated_token) return validated_token

        const { session, user } = yield* UserModel.findByNameWithAuthInfoM(
          username,
        ).pipe(
          Effect.flatMap((result) =>
            result ? Effect.succeed(result) : Effect.fail(AUTH_FAILED_MSG),
          ),
        )

        yield* Effect.tryPromise(() => verify(user.password, password)).pipe(
          Effect.flatMap((x) =>
            x ? Effect.succeed(0) : Effect.fail(AUTH_FAILED_MSG),
          ),
        )

        const new_session = session ?? (yield* SessionModel.createM(user.id))

        return { user: user, session: new_session }
      }).pipe(
        Effect.match({
          onSuccess: ({ user, session }) => {
            store.user = user
            store.session = session
            resetSessionToken(token, session.id)
            return Response.hello(user.name)
          },
          onFailure: (err) => {
            switch (err) {
              case AUTH_FAILED_MSG:
                return Response.err(401, err)
              default:
                if (err instanceof UnknownException)
                  throw new Error(err.message)
                else return Response.internalServerError(err)
            }
          },
        }),
      )

      return Effect.runPromise(task)
    },
    {
      body: "auth::sign",
      cookie: "auth::optional_session",
    },
  )
  .use(auth_guard)
  .get("/sign-out", async ({ cookie: { session_token } }) => {
    try {
      await SessionModel.invalidate(session_token.value)
    } catch (error) {
      return Response.err(500, error)
    }
    session_token.remove()

    return Response.ok("Signed out")
  })
  .get(
    "/profile",
    ({ store: { user } }) => {
      return Response.ok({
        ...user,
        avatar: user.avatar?.filename ?? null,
      })
    },
    {
      response: "user::profile",
    },
  )
  .group("/avatar", {}, (group) =>
    group
      .get(
        "",
        ({ store: { user } }) => {
          const filename = user.avatar?.filename
          if (filename) return redirect(`image/${filename}`)
          else return error(404)
        },
        {
          body: "user::avatar::get",
        },
      )
      .post(
        "",
        async ({
          UserModel,
          store: {
            user,
            session: { user_id },
          },
          body,
        }) => {
          const validated_image = await validateAvatar(body.data)
          return Either.match(validated_image, {
            onLeft(left) {
              return Response.err(400, left)
            },
            async onRight(right) {
              const bytes = new Uint8Array(right)
              const image = await new ImageModel().upload(user_id, {
                bytes,
                extension_name: AVATAR_EXTENSION_NAME,
              })
              await UserModel.updateAvatar({
                user_id,
                image_id: image.id,
              })
              user.avatar = image
              user.avatar_id = image.id

              return Response.ok("OK")
            },
          })
        },
        {
          body: "user::avatar::post",
          response: {
            200: Response.ok.schema(t.String()),
            400: Response.err.schema,
          },
        },
      )
      .delete(
        "",
        async ({ UserModel, store: { user } }) => {
          await UserModel.removeAvatar(user)

          user.avatar = null
          user.avatar_id = null
          return Response.ok("OK")
        },
        {
          response: Response.ok.schema(t.String()),
        },
      ),
  )
