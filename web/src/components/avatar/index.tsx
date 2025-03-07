import {
  createEffect,
  createMemo,
  createSignal,
  Show,
  splitProps,
  type JSX,
} from "solid-js"
import { twMerge } from "tailwind-merge"

export interface Props extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  username?: string
}

export function Avatar(props: Props) {
  let is_invalid_src = createMemo(() => {
    return props.src === undefined || props.src === ""
  })

  let handle_error = () => {
    set_error(true)
  }

  let [error, set_error] = createSignal(false)

  let [_, other_props] = splitProps(props, ["class", "src", "alt", "username"])

  createEffect(() => {
    if (is_invalid_src()) {
      set_error(true)
    }
  })

  return (
    <div
      class={twMerge(
        "inline-block size-8 rounded-full overflow-hidden cursor-pointer",
        props.class,
      )}
    >
      <Show
        when={!error()}
        fallback={
          <div class="size-full flex items-center justify-center bg-gray-200">
            <span class="text-sm text-gray-500">
              {props.username?.[0]?.toUpperCase() ?? "N/A"}
            </span>
          </div>
        }
      >
        <img
          {...other_props}
          src={props.src}
          alt={props.alt ?? "avatar"}
          onError={handle_error}
          class="object-cover size-full"
        />
      </Show>
    </div>
  )
}
