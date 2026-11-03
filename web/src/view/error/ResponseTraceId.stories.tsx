import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { ResponseTraceId } from "./ResponseTraceId"

export default {
	title: "View/Error/ResponseTraceId",
	component: ResponseTraceId,
	parameters: { layout: "centered" },
} satisfies Meta<typeof ResponseTraceId>

type Story = StoryObj<typeof ResponseTraceId>

export const Default: Story = {
	args: { traceId: "4bf92f3577b34da6a3ce929d0e0e4736" },
}
