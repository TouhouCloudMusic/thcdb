import { For, type JSX, type ParentProps } from "solid-js"
import { Cross2Icon, MagnifyingGlassIcon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"
import { TertiaryButton } from "../button/index.tsx"
import { TextField } from "../form/index.tsx"
import { Dialog } from "./index.ts"

export function SearchAndAddDialog<T extends Record<string, unknown>>(
  props: ParentProps & {
    onSubmit?: (args?: T) => unknown
    // onSearch: (args: string) => unknown
    data: T[]
    // setData: (args: T) => unknown
    defaultOpen?: boolean
    listItem: (props: { data: T }) => JSX.Element
    title: JSX.Element
  },
) {
  const onSubmit = (e: Event) => {
    e.preventDefault()
    props.onSubmit?.()
  }

  return (
    <Dialog.Layout
      defaultOpen={props.defaultOpen ?? false}
      trigger={
        <TertiaryButton
          size="Xs"
          class="aspect-square p-1.5"
        >
          <PlusIcon />
        </TertiaryButton>
      }
    >
      <Dialog.Content class="flex max-h-[min(48rem,50%)] min-h-[32rem] max-w-sm flex-col px-0 pb-8">
        <div class="mx-4 flex justify-between">
          <Dialog.Title class="text-lg font-medium">{props.title}</Dialog.Title>
          <Dialog.CloseButton class="aspect-square h-full p-1">
            <Cross2Icon class="m-auto" />
          </Dialog.CloseButton>
        </div>
        <div class="mx-4">
          <form
            onSubmit={onSubmit}
            class="relative mb-6 mt-3 grid grid-rows-1"
          >
            <MagnifyingGlassIcon class="text-tertiary absolute mx-auto size-4 w-8 self-center" />
            <input
              class={twMerge(
                TextField.Input.className,
                `border-0 bg-slate-100 pl-8 ring-0`,
              )}
            />
          </form>
        </div>

        <ul class="bg-secondary border-y-1.5 overflow-auto border-slate-200">
          <For each={props.data}>
            {(data) => (
              <li class="bg-primary border-y-1.5 border-slate-200 px-4">
                <props.listItem data={data} />
              </li>
            )}
          </For>
        </ul>

        {props.children}
      </Dialog.Content>
    </Dialog.Layout>
  )
}
