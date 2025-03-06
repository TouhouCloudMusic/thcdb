import type { Meta, StoryObj } from "storybook-solidjs"

import { Size, Button, Variant } from "."
import { AppColor } from ".."

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: {
        type: "select",
      },
      options: AppColor.iter().toArray(),
    },
    size: {
      control: {
        type: "select",
      },
      options: Size.iter().toArray(),
    },
    variant: {
      control: {
        type: "select",
      },
      options: Variant.iter().toArray(),
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: "Button",
    variant: "Primary",
    color: "Reimu",
    size: "Md",
  },
}

export const Secondary: Story = {
  args: {
    children: "Button",
    variant: "Primary",
    color: "Gray",
    size: "Md",
  },
}

export const Tertiary: Story = {
  args: {
    children: "Button",
    variant: "Tertiary",
    color: "Gray",
    size: "Md",
  },
}
