import { createMemo, type JSX, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type">
export function Input(props: Props) {
  const CLASS = `
		rounded-sm border border-gray-300 pl-2 h-8
		hover:outline-1 outline-reimu-500
		focus:outline-2
		focus:outline-reimu-600
		`

  let [, other_props] = splitProps(props, ["class"])
  let tw_class = createMemo(() => twMerge(CLASS, props.class))

  return (
    <input
      type="text"
      class={tw_class()}
      {...other_props}
    />
  )
}
