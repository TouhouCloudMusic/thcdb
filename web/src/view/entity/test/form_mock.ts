import { createForm } from "@formisch/solid"
import { afterEach, assert, vi } from "vitest"

vi.mock(import("@formisch/solid"), async (importOriginal) => {
	const formisch = { ...(await importOriginal()) }

	vi.spyOn(formisch, "createForm")

	return formisch
})

afterEach(() => {
	vi.mocked(createForm).mockClear()
})

export function getCapturedForm() {
	const [result] = vi.mocked(createForm).mock.results
	assert(result?.type === "return")

	return result.value
}
