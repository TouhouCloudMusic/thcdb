import { createSignal } from "solid-js"
import {
  type ButtonSize,
  PrimaryButton,
  SecondaryButton,
  TertiaryButton,
} from "~/component/button/index.tsx"
import { type ValidColor } from "~/component/index.ts"

export default function () {
  return (
    <main class="mx-auto flex max-w-7xl flex-col gap-8">
      <Button />
    </main>
  )
}

const Button = () => {
  const validColors: ValidColor[] = ["gray", "blue", "reimu", "marisa", "green"]
  const [color, setColor] = createSignal<ValidColor>("gray")
  const validSizes: ButtonSize[] = ["xs", "sm", "md", "lg"]
  const [size, setSize] = createSignal<ButtonSize>("md")

  return (
    <section class="flex w-[512px] flex-col">
      <div class="inline-flex place-content-between">
        <h2>Button</h2>
        <div>
          <select
            value={size()}
            onChange={(e) => setSize(e.target.value as ButtonSize)}
          >
            {validSizes.map((s) => (
              <option value={s}>{s}</option>
            ))}
          </select>
          <select
            value={color()}
            onChange={(e) => setColor(e.target.value as ValidColor)}
          >
            {validColors.map((c) => (
              <option value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div class="grid size-fit grid-cols-3 place-items-center gap-2 self-center *:size-fit">
        <PrimaryButton
          color={color()}
          size={size()}
        >
          Button
        </PrimaryButton>
        <SecondaryButton
          color={color()}
          size={size()}
        >
          Button
        </SecondaryButton>
        <TertiaryButton
          color={color()}
          size={size()}
        >
          Button
        </TertiaryButton>
        <PrimaryButton
          color={color()}
          size={size()}
          disabled
        >
          Button
        </PrimaryButton>
        <SecondaryButton
          color={color()}
          size={size()}
          disabled
        >
          Button
        </SecondaryButton>
        <TertiaryButton
          color={color()}
          size={size()}
          disabled
        >
          Button
        </TertiaryButton>
        <PrimaryButton
          color="warning"
          size={size()}
        >
          Button
        </PrimaryButton>
        <SecondaryButton
          color="warning"
          size={size()}
        >
          Button
        </SecondaryButton>
        <TertiaryButton
          color="warning"
          size={size()}
        >
          Button
        </TertiaryButton>
      </div>
    </section>
  )
}
