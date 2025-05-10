import Croppie from "croppie"
import { createMemo, onCleanup } from "solid-js"

export function createCroppie(
  elm: () => HTMLElement | undefined,
  options: () => Croppie.CroppieOptions,
) {
  const croppie = createMemo(() => {
    return elm() ? new Croppie(elm()!, options()) : null
  })

  onCleanup(() => {
    croppie()?.destroy()
  })

  return croppie
}
