import { createForm } from "@formisch/solid"
import { useMutation } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import type { TagMutation } from "@thc/query"
import { onMount } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { NewTagCorrection } from "~/domain/tag"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { EditTagPage } from "."
import { TagFormDesc } from "./comp/TagFormActions"
import { TagFormProvider } from "./context"
import { toTagFormInitValue } from "./hook/init"

const TAG: Tag = {
	id: 72,
	name: "Touhou arrangement",
	type: "Scene",
	short_description: "东方音乐改编作品。",
	description: "基于东方 Project 原曲的同人音乐。",
	alt_names: [{ id: 1, name: "東方アレンジ" }],
	relations: [],
}

const meta = {
	title: "View/Tag/Edit",
	component: EditTagPage,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: { layout: StoryLayout.FullScreen },
	args: { type: "edit", tag: TAG },
} satisfies Meta<typeof EditTagPage>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}

function SubmissionErrorSection() {
	const initialInput = toTagFormInitValue({ type: "edit", tag: TAG })
	const form = createForm({ schema: NewTagCorrection, initialInput })
	type Mutation = ReturnType<typeof TagMutation.getInstance>
	const mutation = useMutation<
		NonNullable<Mutation["data"]>,
		Error,
		Parameters<Mutation["mutate"]>[0]
	>(() => ({
		mutationFn: () =>
			Promise.reject(new Error("Failed to save the correction.")),
	}))
	onMount(() =>
		mutation.mutate({ type: "Update", id: TAG.id, data: initialInput }),
	)
	return (
		<TagFormProvider value={{ formStore: form, tag: TAG }}>
			<TagFormDesc mutation={mutation} />
		</TagFormProvider>
	)
}

export const SubmissionError: Story = {
	render: () => <SubmissionErrorSection />,
	parameters: { layout: StoryLayout.Padded },
}
