import { expect, test, describe } from "bun:test"
import { createAtom } from "~/util/createAtom"

describe("createAtom with single value", () => {
	const count = createAtom(0)

	test("Get value", () => {
		expect(count()).toBe(0)
	})

	test("Set value", () => {
		count(0)
		count(1)
		expect(count()).toBe(1)
	})

	test("Set value with function", () => {
		count(0)
		count((c) => c + 1)
		expect(count()).toBe(1)
	})
})

describe("createAtom with object", () => {
	const example = {
		foo: 0,
		bar: 1,
	}

	const obj = createAtom(example)

	test("Get value", () => {
		expect(obj()).toEqual(example)
	})

	test("Set value", () => {
		obj({ ...obj(), foo: 1 })

		expect(obj()).toEqual({
			foo: 1,
			bar: 1,
		})
	})

	test("Set value with function", () => {
		obj(example)
		obj((prev) => ({ ...prev, bar: ++prev.bar }))
		expect(obj()).toEqual({
			foo: 0,
			bar: 2,
		})
	})
})
