import { splitProps, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

export type Props = (
  | {
      vertical: true
      horizonal?: undefined
    }
  | {
      vertical?: undefined
      horizonal: true
    }
) &
  JSX.HTMLAttributes<HTMLSpanElement>

export function Divider(props: Props) {
  let direction_class = () => {
    if (props.vertical) {
      return "w-[0.5px] h-full"
    } else {
      return "h-[0.5px] w-full"
    }
  }

  let [_, other_props] = splitProps(props, ["class"])

  return (
    <span
      class={twMerge("bg-slate-300", direction_class(), props.class)}
      {...other_props}
    ></span>
  )
}
