import type { Meta, StoryObj } from "storybook-solidjs"
import * as header from "."
import { type UserContext, UserContextProvider } from "~/state/user"
import baka from "~/components/avatar/baka.jpg"

const meta: Meta<typeof header.Header> = {
  component: header.Header,
  render: (args, { loaded: { user_ctx } }) => (
    <UserContextProvider ctx={user_ctx as UserContext}>
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
