import { sha256 } from "@oslojs/crypto/sha2"
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding"
import { eq } from "drizzle-orm"
import { Effect, Option, pipe } from "effect"
import { type Session } from "~/database"
import { session as session_table } from "~/database/schema"
import { textEncoder } from "~/lib/singletons"
import { db } from "~/service/database/connection"
import { USER_RETURN_WITH, type UserResult } from "../user"

const SessionErrorMsg = {
  CreateFailed: "Create session failed",
  UpdateFailed: "Update session failed",
  DeleteFailed: "Delete session failed",
  FindFailed: "Find session failed",
  NotFound: "Session not found",
} as const

export type SessionValidateResult = {
  user: UserResult
  session: Session
}
export type SessionToken = string & { type: "SessionToken" }
export class SessionModel {
  static generateToken(): SessionToken {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return encodeBase32LowerCaseNoPadding(bytes) as SessionToken
  }

  static async create(
    user_id: number,
    token: SessionToken = this.generateToken(),
  ): Promise<Session> {
    const id = pipe(textEncoder.encode(token), sha256, encodeHexLowerCase)

    const new_session: Session = {
      id,
      user_id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    }
    await db.insert(session_table).values(new_session)
    return new_session
  }

  static createM(id: number, token?: SessionToken) {
    return Effect.tryPromise({
      try: () => SessionModel.create(id, token),
      catch(e) {
        console.log(e)
        return SessionErrorMsg.CreateFailed
      },
    })
  }

  private static async findByToken(
    token: string,
  ): Promise<SessionValidateResult | undefined> {
    return await db.query.session
      .findFirst({
        where: (field, op) => op.eq(field.id, token),
        with: {
          user: {
            with: USER_RETURN_WITH,
          },
        },
      })
      .then((x) => {
        if (!x) return x

        const { user, ...session } = x
        return {
          user: {
            ...user,
            role: user.role.map((x) => x.role.name),
          },
          session,
        }
      })
  }

  private static findByTokenM(token: string) {
    const findSession = this.findByToken.bind(this)

    return Effect.tryPromise({
      try: () => findSession(token),
      catch(e) {
        console.log(e)
        return SessionErrorMsg.FindFailed
      },
    }).pipe(Effect.map((x) => Option.fromNullable(x)))
  }

  static async update(session: Session): Promise<void> {
    await db
      .update(session_table)
      .set(session)
      .where(eq(session_table.id, session.id))
  }

  static updateM(session: Session) {
    return Effect.tryPromise({
      try: () => this.update(session) as unknown as Promise<void>,
      catch: () => SessionErrorMsg.UpdateFailed,
    })
  }

  static async validateToken(
    token: string,
  ): Promise<SessionValidateResult | null> {
    const result = await this.findByToken(token)
    if (!result) return null

    const { session, user } = result

    if (Date.now() >= session.expires_at.getTime()) {
      await this.invalidate(token)
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
    return { user, session }
  }

  static validateTokenM({ token }: { token: string }) {
    const findSesion = this.findByTokenM.bind(this)
    const invalidateSession = this.invalidateM.bind(this)
    const updateSession = this.updateM.bind(this)

    return Effect.gen(function* () {
      const result = yield* findSesion(token)

      if (Option.isNone(result)) return null
      const { user, session } = result.value

      const expries_at = session.expires_at.getTime()

      if (Date.now() >= expries_at) {
        yield* invalidateSession(token)
        return null
      }

      if (Date.now() >= expries_at - 1000 * 60 * 60 * 24 * 15) {
        session.expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        yield* updateSession(session)
      }
      return { user, session }
    })
  }

  static async invalidate(token: string): Promise<void> {
    await db.delete(session_table).where(eq(session_table.id, token))
  }

  static invalidateM(token: string) {
    return Effect.tryPromise({
      try: () => this.invalidate(token),
      catch: () => SessionErrorMsg.DeleteFailed,
    })
  }
}
