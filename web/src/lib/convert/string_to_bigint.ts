import * as Either from "fp-ts/either"
import { validateError } from "../validate/validate_error"

export function stringToBigInt(str: string) {
  return Either.tryCatch(
    () => BigInt(str),
    (err) => validateError(err),
  )
}
