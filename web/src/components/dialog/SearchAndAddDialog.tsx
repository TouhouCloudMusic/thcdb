import { For, type JSX, type ParentProps } from "solid-js"
import { createSignal, createMemo } from "solid-js"
import { Cross2Icon, MagnifyingGlassIcon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Dialog } from "."
import { Button } from "../button/index.tsx"
import { TextField } from "../form/index.tsx"

export type SearchAndAddDialogProps<T> = ParentProps<{
  onSubmit?: (args?: T) => unknown
  // onSearch: (args: string) => unknown
  data: T[]
  // setData: (args: T) => unknown
  defaultOpen?: boolean
  listItem: (props: { data: T }) => JSX.Element
  title: JSX.Element
}>

export function SearchAndAddDialog<T extends Record<string, unknown>>(
  props: SearchAndAddDialogProps<T>,
) {
  const [searchQuery, setSearchQuery] = createSignal("")

  const filteredData = createMemo(() =>
    props.data.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchQuery().toLowerCase()),
    ),
  )

  const onSubmit = (e: Event) => {
    e.preventDefault()
    props.onSubmit?.()
  }

  return (
    <Dialog.Root defaultOpen={props.defaultOpen ?? false}>
      <Dialog.Trigger
        as={Button}
        variant="Tertiary"
        size="Xs"
        class="aspect-square p-1.5"
      >
        <PlusIcon />
      </Dialog.Trigger>
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
            class="relative mt-3 mb-6 grid grid-rows-1"
          >
            <MagnifyingGlassIcon class="absolute mx-auto size-4 w-8 self-center text-tertiary" />
            <input
              class={twMerge(
                TextField.Input.className,
                `border-0 bg-slate-100 pl-8 ring-0`,
              )}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </form>
        </div>

        <ul class="border-y-1.5 w-full overflow-auto px-4">
          <For each={filteredData()}>
            {(data) => (
              <li class="border-y-1.5 border-slate-200 bg-primary px-4">
                <props.listItem data={data} />
              </li>
            )}
          </For>
        </ul>

        {props.children}
      </Dialog.Content>
    </Dialog.Root>
  )
}
