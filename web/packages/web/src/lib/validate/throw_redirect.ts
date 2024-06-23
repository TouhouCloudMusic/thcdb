import { redirect } from "@solidjs/router"
import { either } from "fp-ts"
import { pipe } from "fp-ts/lib/function"

export function validateAndThrowRedirect<T, U>(
	validateFn: (x: T) => either.Either<Error, U>,
	x: T
) {
	return pipe(
		x,
		validateFn,
		either.match(
			() => {
				throw redirect("/404")
			},
			(x) => x
		)
	)
}
