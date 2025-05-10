import { type Accessor, createMemo, onCleanup } from "solid-js"

export function createUrl<T extends File | undefined>(
  file: Accessor<T>,
): T extends File ? Accessor<string> : Accessor<undefined> {
  const memo = createMemo(() => {
    const _file = file()
    if (!_file) return

    let url = window.URL.createObjectURL(_file)

    onCleanup(() => window.URL.revokeObjectURL(url))

    return url
  })

  return memo as T extends File ? Accessor<string> : Accessor<undefined>
}
