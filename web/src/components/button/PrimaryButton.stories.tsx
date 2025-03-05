import type { Meta, StoryObj } from "storybook-solidjs"

import { PrimaryButton } from "."

const meta: Meta<typeof PrimaryButton> = {
  component: PrimaryButton,
}

export default meta
type Story = StoryObj<typeof PrimaryButton>

export const Primary: Story = {
  args: {
    children: <>Button</>,
    color: "blue",
  },
}
