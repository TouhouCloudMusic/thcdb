import { createMemo, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

export type Props = JSX.HTMLAttributes<HTMLDivElement>
export function Card(props: Props) {
  const CLASS = "rounded-sm shadow-md p-4"

  let classes = createMemo(() => twMerge(CLASS, props.class))

  return (
    <div
      {...props}
      class={classes()}
    ></div>
  )
}
