import { error, t, type StatusMap, type TSchema } from "elysia"
import { type ElysiaCustomStatusResponse } from "elysia/error"

const ResponseState = {
  Success: "success",
  Error: "error",
} as const
type ResponseState = typeof ResponseState
type Ok<T> = {
  readonly state: ResponseState["Success"]
  readonly data: T
}

type Error<
  Code extends number | keyof StatusMap,
  E,
> = ElysiaCustomStatusResponse<
  Code,
  {
    readonly state: ResponseState["Error"]
    readonly message: E
  }
>

function ok<const T>(data: T): Ok<T> {
  return {
    state: ResponseState.Success,
    data,
  }
}
ok.schema = function <T extends TSchema>(schema: T) {
  return t.Object({
    state: t.Literal(ResponseState.Success),
    data: schema,
  })
}

function err<Code extends number | keyof StatusMap, const E>(
  code: Code,
  messaage: E,
): Error<Code, E> {
  return error(code, { state: ResponseState.Error, message: messaage })
}
err.schema = t.Object({
  state: t.Literal(ResponseState.Error),
  message: t.String(),
})

function notFound(): Error<404, "404 Not Found">
function notFound<const E extends string>(message: E): Error<404, E>
function notFound<E>(message?: E) {
  return error(404, {
    state: ResponseState.Error,
    message: message ?? "404 Not Found",
  })
}
function internalServerError(): Error<500, "Internal Server Error">
function internalServerError<const E extends string>(message: E): Error<500, E>
function internalServerError<E>(message?: E) {
  return error(500, {
    state: ResponseState.Error,
    message: message ?? "Internal Server Error",
  })
}

function hello<T extends string>(name: T): Ok<`Hello, ${T}`> {
  return ok(`Hello, ${name}`)
}

export const Response = {
  ok,
  err,
  notFound,
  internalServerError,
  hello,
}
