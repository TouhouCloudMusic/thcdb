import type { Meta, StoryObj } from "storybook-solidjs"
import baka from "~/components/avatar/baka.jpg"
import { type UserContext, UserContextProvider } from "~/state/user"

import * as header from "."

const meta: Meta<typeof header.Header> = {
  component: header.Header,
  render: (args, { loaded: { user_ctx } }) => (
    <UserContextProvider user={user_ctx as UserContext}>
      <header.Header {...args} />
    </UserContextProvider>
  ),
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof header.Header>

export const LoggedIn: Story = {
  loaders: [
    // eslint-disable-next-line @typescript-eslint/require-await
    async () => {
      return {
        user_ctx: {
          notifications: [],
          user: {
            name: "Cirno",
            avatar_url: baka,
          },
        } as UserContext,
      }
    },
  ],
}

export const LoggedOut: Story = {
  loaders: [
    // eslint-disable-next-line @typescript-eslint/require-await
    async () => {
      return {
        user_ctx: undefined as UserContext,
      }
    },
  ],
}
