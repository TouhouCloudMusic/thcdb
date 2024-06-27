import { Params } from "@solidjs/router"
import { either } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import { InvalidParamError } from "../error/errors"

export function isValidID(params: Params) {
	return pipe(
		either.tryCatch(
			() => params["id"],
			() => new InvalidParamError("id")
		),
		either.chain((id) =>
			id ? either.right(id) : either.left(new InvalidParamError("id"))
		)
	)
}

export function isEmptyOrValidID(
	params: Params
): either.Either<InvalidParamError, undefined | string> {
	const id = params["id"]
	return id === "" ? either.right(undefined) : isValidID(params)
}
