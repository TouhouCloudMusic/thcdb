import { type Ref, type ParentProps, createMemo, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button, type Props as ButtonProps } from "../button"

export function Sidebar(
  props: ParentProps & {
    class?: string
    ref?: Ref<HTMLDivElement> | undefined
  },
) {
  return (
    <div
      ref={props.ref}
      class={twMerge(
        "h-full w-60 bg-primary ml-auto border-t-reimu-600 border-t-1 flex overflow-auto",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

export function ListItem(props: ParentProps<ButtonProps>) {
  const CLASS = `
    flex items-center
    py-1 px-1
    font-light font-inter text-sm text-slate-700
    *:mx-1
    [&_svg]:size-4 [&_svg]:text-slate-600
  `

  let [_, other_props] = splitProps(props, ["class"])
  let tw_class = createMemo(() => twMerge(CLASS, props.class))
  return (
    <Button
      {...other_props}
      variant="Tertiary"
      class={tw_class()}
    />
  )
}
