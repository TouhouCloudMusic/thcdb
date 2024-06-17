import { expect, test } from "bun:test"
import { InvalidParamError, NotFoundError } from "~/lib/error/errors"

test("Invalid Params Error", () => {
	const err = new InvalidParamError("id")
	expect(err.message).toBe("Invalid parameter: id")
	expect(err.name).toBe("InvalidParamError")
})

test("Not Found Error", () => {
	const err = new NotFoundError()
	expect(err.message).toBe("not found")
	expect(err.name).toBe("NotFoundError")
})
