import { type ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button } from "../button"

export function Sidebar(
  props: ParentProps & {
    class?: string
  },
) {
  return (
    <div
      class={twMerge(
        "h-full w-48 bg-primary ml-auto border-t-reimu-600 border-t-1 flex overflow-auto",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

export function ListItem(props: ParentProps) {
  const CLASS = `
    flex items-center
    py-1 px-1
    font-light font-inter text-xs text-slate-900
    *:mx-1
    [&_svg]:size-3 [&_svg]:text-slate-600
  `
  return (
    <Button
      variant="Tertiary"
      class={CLASS}
    >
      {props.children}
    </Button>
  )
}
