import { io, myEffect } from "@touhouclouddb/utils"
import { eq } from "drizzle-orm"
import { Effect, Either, flow, identity, pipe } from "effect"
import type { Session, User } from "~/database"
import { session as session_table } from "~/database/schema"
import { db } from "~/service/database"

const SessionErrorMsg = {
  FailedToCreateSession: "Failed to create session",
  FailedToUpdateSession: "Failed to update session",
  FailedToDeleteSession: "Failed to delete session",
  FailedToFindSession: "Failed to find session",
  SessionNotFound: "Session not found",
} as const

export type SessionValidateResult = {
  session: Session
  user: User
}
export type SessionToken = string & { type: "SessionToken" }
export class SessionModel {
  static generateSessionToken(): SessionToken {
    return crypto.randomUUID() as SessionToken
  }

  static async createSession(
    token: SessionToken,
    user_id: number,
  ): Promise<Session> {
    const new_session: Session = {
      id: token,
      user_id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    }
    await db.insert(session_table).values(new_session)
    return new_session
  }

  static createSessionM({ user }: { user: { id: number } }) {
    return Effect.tryPromise({
      try: () =>
        SessionModel.createSession(
          SessionModel.generateSessionToken(),
          user.id,
        ),
      catch: identity,
    }).pipe(
      Effect.mapError((x) => {
        console.log(x)

        return SessionErrorMsg.FailedToCreateSession
      }),
    )
  }

  static async findSession(
    token: string,
  ): Promise<SessionValidateResult | undefined> {
    return await db.query.session
      .findFirst({
        where: (field, op) => op.eq(field.id, token),
        with: { user: true },
      })
      .then((x) => {
        if (!x) return x
        const { user, ...session } = x
        return { user, session }
      })
  }

  static findSessionM(token: string) {
    return Effect.tryPromise({
      try: io.of(this.findSession(token)),
      catch: io.of(SessionErrorMsg.FailedToFindSession),
    }).pipe(
      Effect.map((x) =>
        Either.fromNullable(x, () => SessionErrorMsg.SessionNotFound),
      ),
    )
  }

  static async updateSession(session: Session) {
    return await db
      .update(session_table)
      .set(session)
      .where(eq(session_table.id, session.id))
  }

  static updateSessionM(session: Session) {
    return Effect.tryPromise({
      try: () => this.updateSession(session),
      catch: () => SessionErrorMsg.FailedToUpdateSession,
    }).pipe(Effect.map(() => {}))
  }

  static async validateToken({
    token,
  }: {
    token: string
  }): Promise<SessionValidateResult | null> {
    const result = await this.findSession(token)
    if (!result) return null

    const { user, session } = result

    if (Date.now() >= session.expires_at.getTime()) {
      await this.invalidateSession(token)
      return null
    }

    if (Date.now() >= session.expires_at.getTime() - 1000 * 60 * 60 * 24 * 15) {
      session.expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      await db
        .update(session_table)
        .set({
          expires_at: session.expires_at,
        })
        .where(eq(session_table.id, session.id))
    }
    return { session, user }
  }

  static validateTokenM({ token }: { token: string }) {
    return pipe(
      token,
      this.findSessionM,
      myEffect.flatMap(
        flow(
          Either.map((result) => {
            const replace_with = (ef: Effect.Effect<any, any, any>) =>
              Effect.map(ef, () => result)

            const on_expired = () =>
              this.invalidateSessionM(token).pipe(replace_with)

            const refresh_expires_at = () => {
              session.expires_at = new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 30,
              )
              return this.updateSessionM(session).pipe(replace_with)
            }

            let { session } = result
            let now = Date.now()
            let expires_at = session.expires_at.getTime()
            if (now >= expires_at) {
              return on_expired()
            }
            if (now >= expires_at - 1000 * 60 * 60 * 24 * 15) {
              return refresh_expires_at()
            }
            return Effect.succeed(result)
          }),
          Either.match({
            onLeft: (x) => Effect.succeed(x),
            onRight: (x) => x,
          }),
        ),
      ),
    )
  }

  static async invalidateSession(token: string): Promise<void> {
    await db.delete(session_table).where(eq(session_table.id, token))
  }

  static invalidateSessionM(token: string) {
    return Effect.tryPromise({
      try: () => this.invalidateSession(token),
      catch: () => SessionErrorMsg.FailedToDeleteSession,
    })
  }
}

// abstract class SessionError {
//   static FailedToCreateSession() {
//     return new FailedToCreateSessionError()
//   }

//   static FailedToDeleteSession() {
//     return new FailedToDeleteSessionError()
//   }
// }

// class FailedToCreateSessionError extends Error {
//   constructor() {
//     super(FAILED_TO_CREATE_SESSION_MSG)
//   }
// }

// class FailedToDeleteSessionError extends Error {
//   constructor() {
//     super(FAILED_TO_DELETE_SESSION_MSG)
//   }
// }
