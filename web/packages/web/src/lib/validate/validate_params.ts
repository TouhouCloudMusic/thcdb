import type { Params } from "@solidjs/router"
import * as Either from "fp-ts/either"
import { pipe } from "fp-ts/function"
import { InvalidParamError } from "../error/errors"
export function isValidID(params: Params) {
	return pipe(
		Either.tryCatch(
			() => params["id"],
			() => new InvalidParamError("id")
		),
		Either.chain((id) =>
			id ? Either.right(id) : Either.left(new InvalidParamError("id"))
		)
	)
}

export function isEmptyOrValidID(
	params: Params
): Either.Either<InvalidParamError, undefined | string> {
	const id = params["id"]
	return id === "" ? Either.right(undefined) : isValidID(params)
}
