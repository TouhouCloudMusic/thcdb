import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import {
	MOCK_CORRECTION_COMPARE,
	MOCK_CORRECTION_DETAIL,
	MOCK_CORRECTION_DIFF,
	MOCK_CORRECTION_HISTORY,
	MOCK_CORRECTION_ID,
} from "~/mock/correction"
import { withStoryApi } from "~/storybook/api"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { CorrectionDetailPage } from "./Detail"

const responses: Record<string, Response> = {
	[`/api/correction/${MOCK_CORRECTION_ID}`]: Response.json({
		status: "Ok",
		data: MOCK_CORRECTION_DETAIL,
	}),
	[`/api/correction/${MOCK_CORRECTION_ID}/diff`]: Response.json({
		status: "Ok",
		data: MOCK_CORRECTION_DIFF,
	}),
	"/api/artist/24/corrections": Response.json({
		status: "Ok",
		data: MOCK_CORRECTION_HISTORY,
	}),
	[`/api/correction/${MOCK_CORRECTION_ID}/comments`]: Response.json({
		status: "Ok",
		data: MOCK_CORRECTION_DETAIL.comments,
	}),
}
for (const [id, diff] of Object.entries(MOCK_CORRECTION_COMPARE)) {
	responses[`/api/correction/${id}/compare/${MOCK_CORRECTION_ID}`] =
		Response.json({ status: "Ok", data: diff })
}

function StoryRoot() {
	const [compareId, setCompareId] = createSignal<number>()
	return (
		<CorrectionDetailPage
			correctionId={MOCK_CORRECTION_ID}
			compareId={compareId()}
			onCompareIdChange={setCompareId}
		/>
	)
}

const meta = {
	title: "View/Correction/Detail",
	component: StoryRoot,
	decorators: [
		withEntityDetailStoryState,
		withStoryRouter,
		withStoryApi(responses),
	],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
