import { either } from "fp-ts"
import { validateError } from "../validate/validate_error"

export function stringToBigInt(str: string) {
	return either.tryCatch(
		() => BigInt(str),
		(err) => validateError(err)
	)
}
