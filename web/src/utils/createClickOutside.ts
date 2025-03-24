import type { Accessor, Setter } from "solid-js"

export function createClickOutside<T extends HTMLElement>(
  ref: Accessor<T>,
  setter: Setter<boolean>,
) {
  return (event: Event) => {
    if (!ref().contains(event.target as Node)) {
      setter(false)
    }
  }
}
