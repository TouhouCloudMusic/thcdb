import { error, StatusMap } from "elysia"
import { ElysiaCustomStatusResponse } from "elysia/error"

type Ok<T> = {
  readonly state: "success"
  readonly data: T
}

type Error<
  Code extends number | keyof StatusMap,
  E,
> = ElysiaCustomStatusResponse<
  Code,
  {
    readonly state: "error"
    readonly message: E
  }
>

interface Response {
  ok<const T>(data: T): Ok<T>
  err<Code extends number | keyof StatusMap, const E>(
    code: Code,
    messaage: E,
  ): Error<Code, E>
  notFound(): Error<404, "404 Not Found">
  notFound<const E>(message: E): Error<404, E>
  internalServerError(): Error<500, "Internal Server Error">
  internalServerError<const E>(message: E): Error<500, E>

  hello(name: string): Ok<`Hello, ${string}`>
}

export const Response: Response = {
  ok(data) {
    return {
      state: "success",
      data,
    }
  },
  err<Code extends number | keyof StatusMap, const E>(
    code: Code,
    messaage: E,
  ): Error<Code, E> {
    return error(code, { state: "error", message: messaage })
  },
  notFound<E>(message?: E) {
    return error(404, {
      state: "error",
      message: message ?? "404 Not Found",
    })
  },
  internalServerError<E>(message?: E) {
    return error(500, {
      state: "error",
      message: message ?? "Internal Server Error",
    })
  },
  hello(name: string) {
    return Response.ok(`Hello, ${name}`)
  },
}
