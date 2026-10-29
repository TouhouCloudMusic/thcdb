import { getInput } from "@formisch/solid"
import { describe, expect, it, vi } from "vitest"

import { createMockNamedReference } from "~/mock/reference"
import { createMockTag } from "~/mock/tag"
import { renderEditor } from "~/view/entity/test/edit_form"
import { getCapturedForm } from "~/view/entity/test/form_mock"
import { EditTagPage } from "~/view/tag/edit"

await vi.hoisted(() => import("~/view/entity/test/form_mock"))

const alternativeName = createMockNamedReference(13)
const relatedTag = createMockNamedReference(14)
const tag = createMockTag(12, {
	type: "Genre",
	alt_names: [alternativeName],
	relations: [{ tag: { ...relatedTag, type: "Genre" }, type: "Inherit" }],
})

describe("tag editor", () => {
	it("opening an existing entity for editing preserves its editable values in the form", async () => {
		expect.hasAssertions()
		await renderEditor(() => (
			<EditTagPage
				type="edit"
				tag={tag}
			/>
		))
		const expected = {
			type: "Update",
			description: "",
			data: {
				name: tag.name,
				type: "Genre",
				short_description: tag.short_description,
				description: tag.description,
				alt_names: [alternativeName.name],
				relations: [{ tag: relatedTag, type: "Inherit" }],
			},
		}
		const input = getInput(getCapturedForm())
		expect(input).toMatchObject(expected)
	})
})
