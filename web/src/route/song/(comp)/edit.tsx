import { autoUpdate } from "@floating-ui/dom"
import { useFloating } from "solid-floating-ui"
import { createEffect, on, onCleanup } from "solid-js"
import { ShowPortal } from "~/utils/ShowPortal"
import { createAtom } from "~/utils/createAtom"
import { createClickOutsize } from "~/utils/createClickOutside"

const itemClass = "px-2 py-1"
export function EditComp() {
  const open = createAtom(false)
  const anchor = createAtom<HTMLElement>()
  const dropdown = createAtom<HTMLElement>()
  const position = useFloating(anchor, dropdown, {
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  })
  const clickOutside = createClickOutsize([dropdown, anchor], open)
  createEffect(
    on(open, () => {
      if (open()) document.addEventListener("click", clickOutside)
      else document.removeEventListener("click", clickOutside)
      onCleanup(() => document.removeEventListener("click", clickOutside))
    }),
  )
  // onCleanup(() => document.removeEventListener("click", clickOutside));
  return (
    <>
      <button
        class="text-sm text-gray-600 hover:text-gray-600/70"
        ref={anchor}
        onClick={() => {
          open((x) => !x)
        }}
      >
        Edit
      </button>
      <ShowPortal when={open()}>
        <ul
          class="flex flex-col divide-y-[0.125rem] rounded-[0.125rem] border-[0.1rem] border-gray-200 bg-white"
          ref={dropdown}
          style={{
            position: position.strategy,
            top: 0,
            left: 0,
            transform: `translate3d(${position.x ?? 0}px,${position.y ?? 0}px,0`,
          }}
        >
          <li class={itemClass}>
            <a
              href="song/edit/[id]"
              class="text-nowrap"
            >
              Edit This Page
            </a>
          </li>
          <li class={itemClass}>
            <a href="/song/[id]/history">History</a>
          </li>
        </ul>
      </ShowPortal>
    </>
  )
}
