import { createSignal, type JSX, Show, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type UserProfile } from "~/model/user"

import { createEffect } from "../../../dist/assets/web-BNG3azGW"

export interface Props
  extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  user?: UserProfile | undefined
}

export function Avatar(props: Props) {
  let [error, set_error] = createSignal(false)

  let [_, other_props] = splitProps(props, ["class", "user"])

  createEffect(() => {
    console.log(error())
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
              {props.user?.name[0]?.toUpperCase() ?? "N/A"}
            </span>
          </div>
        }
      >
        <img
          {...other_props}
          src={props.user?.avatar_url ?? ""}
          alt={props.alt ?? "avatar"}
          onError={() => {
            set_error(true)
          }}
          class="object-cover size-full"
        />
      </Show>
    </div>
  )
}
