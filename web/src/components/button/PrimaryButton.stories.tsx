import type { Meta, StoryObj } from "storybook-solidjs"

import { ButtonSize, PrimaryButton } from "."
import { ValidColor } from ".."

const meta: Meta<typeof PrimaryButton> = {
  component: PrimaryButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: {
        type: "select",
      },
      options: ValidColor.iter().toArray(),
    },
    size: {
      control: {
        type: "select",
      },
      options: ButtonSize.iter().toArray(),
    },
  },
}

export default meta
type Story = StoryObj<typeof PrimaryButton>

export const Primary: Story = {
  args: {
    children: <>Button</>,
    color: "reimu",
    size: "sm",
  },
}
