import { For, type JSX, type ParentComponent } from "solid-js"

export type LayoutProps = {
  class?: string | undefined
  children: ParentComponent<{ class?: string }>
}

export function Layout(props: LayoutProps) {
  return <props.children class="pl-8 py-8" />
}

export type MinimapLayoutProps<
  Labels extends string[],
  Fields extends FieldComp[],
> =
  Labels["length"] extends Fields["length"] ?
    {
      labels: Labels
      fields: Fields
      children: ParentComponent<{ class?: string | undefined }>
    }
  : `Error: Length of labels [${Labels["length"]}] and components [${Fields["length"]}] are mismatch`

type FieldProps = {
  label: string
}
type FieldComp = (props: FieldProps) => JSX.Element

export function MinimapLayout<
  const Labels extends string[],
  const Fields extends FieldComp[],
>(props: MinimapLayoutProps<Labels, Fields>) {
  assert(props)

  return (
    <div class="grid grid-cols-2">
      <Minimap labels={props.labels} />
      <Layout>
        {(layout_props) => (
          <props.children class={layout_props.class}>
            <For each={props.fields}>
              {(Field, idx) => <Field label={props.labels[idx()]!} />}
            </For>
          </props.children>
        )}
      </Layout>
    </div>
  )
}

function assert<T>(_: T): asserts _ is Exclude<T, string> {
  return
}

type MinimapProps = {
  labels: string[]
}

function Minimap(props: MinimapProps) {
  return (
    <nav class="h-full text-sm bg-slate-100 place-content-center">
      <ul class="grid grid-flow-row grid-cols-1 size-full w-3/4 h-3/4 m-auto">
        <For each={props.labels}>
          {(item) => (
            <li class="self-center place-self-center">
              <a
                class="size-full "
                href={`#${item}`}
              >
                · {item}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  )
}
