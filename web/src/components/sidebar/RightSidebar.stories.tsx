import type { Meta, StoryObj } from "storybook-solidjs"
import * as right from "./right"
import { type UserContext, UserContextProvider } from "~/state/user"
import * as mock from "~/mock"

const meta: Meta<typeof right.RightSidebar> = {
  component: right.RightSidebar,
  render: (_, { loaded: { user_ctx } }) => (
    <UserContextProvider ctx={user_ctx as UserContext}>
      <right.RightSidebar
        onClose={() => {
          return
        }}
      />
    </UserContextProvider>
  ),
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof right.RightSidebar>

export const RightSidebar: Story = {
  loaders: [
    // eslint-disable-next-line @typescript-eslint/require-await
    async () => {
      return {
        user_ctx: mock.USER_CTX,
      }
    },
  ],
}
