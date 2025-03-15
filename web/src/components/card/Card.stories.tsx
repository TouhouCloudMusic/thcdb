import type { Meta, StoryObj } from "storybook-solidjs"
import { StoryLayout } from "~/utils/storybook_ext"

import { Card } from "."

const meta: Meta<typeof Card> = {
  component: Card,
  parameters: {
    layout: StoryLayout.Centered,
  },
  tags: ["autodocs"],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card class="font-inter w-96 m-auto">
      <h1 class="font-semibold text-2xl">This is a card</h1>
      <article class=" text-secondary">
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Non eveniet,
        ratione porro voluptates dolor eligendi error consequuntur cum provident
        unde odio recusandae, optio adipisci! Obcaecati, fugit laboriosam. Aut,
        expedita pariatur!
      </article>
    </Card>
  ),
}
