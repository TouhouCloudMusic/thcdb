import { getInput } from "@formisch/solid"
import { describe, expect, it, vi } from "vitest"

import { createMockLabel } from "~/mock/label"
import { createMockNamedReference } from "~/mock/reference"
import { renderEditor } from "~/view/entity/test/edit_form"
import { getCapturedForm } from "~/view/entity/test/form_mock"
import { EditLabelPage } from "~/view/label/edit"

await vi.hoisted(() => import("~/view/entity/test/form_mock"))

const language = { id: 1, code: "ja", name: "Japanese" }
const founder = createMockNamedReference(2)

const label = createMockLabel(9, {
	localized_names: [{ language, name: "レーベル" }],
	founded_date: { value: "2000-01-01", precision: "Year" },
	dissolved_date: { value: "2025-06-01", precision: "Month" },
	founders: [founder],
	links: ["https://example.com/label"],
})

describe("label editor", () => {
	it("opening an existing entity for editing preserves its editable values in the form", async () => {
		expect.hasAssertions()
		await renderEditor(
			() => (
				<EditLabelPage
					type="edit"
					label={label}
				/>
			),
			[language],
		)

		const expected = {
			type: "Update",
			description: "",
			data: {
				name: label.name,
				localized_names: [{ language, name: "レーベル" }],
				founded_date: {
					value: new Date("2000-01-01T00:00:00Z"),
					precision: "Year",
				},
				dissolved_date: {
					value: new Date("2025-06-01T00:00:00Z"),
					precision: "Month",
				},
				founders: [founder],
				links: ["https://example.com/label"],
			},
		}
		const input = getInput(getCapturedForm())

		expect(input).toStrictEqual(expected)
	})
})
