import { createForm } from "@formisch/solid"
import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"
import * as v from "valibot"

import { HttpUrl } from "~/domain/shared/schema"
import { px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"

import { ExternalLinksField } from "./ExternalLinksField"

const styles = stylex.create({
	root: { width: px[384] },
})

function StoryRoot() {
	const form = createForm({
		schema: v.object({ data: v.object({ links: v.array(HttpUrl) }) }),
		initialInput: {
			data: {
				links: ["https://example.com/catalog/42"],
			},
		},
	})

	return (
		<ExternalLinksField
			of={form}
			styles={styles.root}
		/>
	)
}

const meta = {
	title: "Component/Form/ExternalLinksField",
	component: StoryRoot,
	parameters: {
		layout: StoryLayout.Padded,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
