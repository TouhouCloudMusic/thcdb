import { type Meta, type StoryObj } from "storybook-solidjs"

import { SearchAndAddDialog } from "./SearchAndAddDialog"

const meta = {
  component: SearchAndAddDialog,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text", description: "Dialog title" },
    data: { control: "object", description: "Data to display in the list" },
    onSubmit: { action: "submitted", description: "Submit callback" },
    listItem: { description: "Function to render list item" },
  },
} satisfies Meta<typeof SearchAndAddDialog>

export default meta
type Story = StoryObj<typeof SearchAndAddDialog>

// 示例
export const Default: Story = {
  render: (args) => {
    return (
      <>
        <SearchAndAddDialog
          {...args}
          data={[{ name: "Item 1" }, { name: "Item 2" }]}
          listItem={(props) => <div>{props.data.name}</div>}
          defaultOpen={true}
          onSubmit={(_) => {
            console.log("Submitted")
          }}
        />
      </>
    )
  },
  args: {
    title: "添加物品",
  },
}
