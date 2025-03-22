"use server"

import { redirect } from "@solidjs/router"
import * as Either from "fp-ts/either"
import { pipe } from "fp-ts/function"

export function validateAndThrowRedirectEither<T, U>(
  validateFn: (x: T) => Either.Either<Error, U>,
  x: T,
) {
  return pipe(
    x,
    validateFn,
    Either.match(
      () => {
        throw redirect("/404")
      },
      (x) => x,
    ),
  )
}
