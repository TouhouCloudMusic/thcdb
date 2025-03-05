/* eslint-disable solid/reactivity */
import { Button } from "@kobalte/core/button"
import { mergeProps, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type ValidColor } from "~/components"
/**
 * Note: 样式没做完
 */
export type ButtonSize = "xs" | "sm" | "md" | "lg"
export const ButtonSize = {
  iter: function* () {
    yield "xs"
    yield "sm"
    yield "md"
    yield "lg"
  },
}

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize
  color?: ValidColor
}

const sizeClassList = {
  // @tw
  xs: "text-xs py-1 px-1.5",
  // @tw
  sm: "text-sm py-1 px-2.5",
  // @tw
  md: "text-base py-1.5 px-3.5",
  // @tw
  lg: "text-xl py-4 px-8",
} as const

function mergeButtonProps(props: ButtonProps, style: string): ButtonProps {
  const BUTTON_COMMON_STYLES = `rounded-sm transition-all font-medium p1`
  return mergeProps({ type: "button" as const }, props, {
    get class() {
      return twMerge(
        BUTTON_COMMON_STYLES,
        props.size ? sizeClassList[props.size] : undefined,
        style,
        props.class,
      )
    },
  })
}

export function PrimaryButton(props: ButtonProps) {
  const STYLE_VARIANTS: Record<ValidColor, string> = {
    gray:
      // @tw
      `
      bg-gray-1100 hover:bg-gray-1000 active:bg-gray-900 disabled:bg-gray-800
      `,
    blue:
      // @tw
      `
      bg-blue-700 hover:bg-blue-600 active:bg-blue-500 disabled:bg-blue-700/500
      dark:disabled:bg-blue-600
      `,
    reimu:
      // @tw
      `
      bg-reimu-700 hover:bg-reimu-600 active:bg-reimu-500 disabled:bg-blue-700/500
      dark:disabled:bg-reimu-600
      `,
    marisa:
      // @tw
      `
      dark:text-marisa-1200
      bg-marisa-1200 hover:bg-marisa-1000 active:bg-marisa-900 disabled:bg-marisa-800
      dark:bg-marisa-500 dark:hover:bg-marisa-600 dark:active:bg-marisa-700 dark:disabled:bg-marisa-600
      `,
    green:
      // @tw
      `
         dark:text-green-1200
        bg-green-1200 hover:bg-green-1000 active:bg-green-900 disabled:bg-green-800
        dark:bg-green-500 dark:hover:bg-green-600 dark:active:bg-green-700 dark:disabled:bg-green-600`,
    slate:
      // @tw
      `
      dark:text-slate-1200
      bg-slate-1200 hover:bg-slate-1000 active:bg-slate-900 disabled:bg-slate-800
      dark:bg-slate-500 dark:hover:bg-slate-600 dark:active:bg-slate-700 dark:disabled:bg-slate-600
      `,
  }

  return (
    <Button
      {...mergeButtonProps(
        props,
        `shadow-sm text-(--background-color-primary)`.concat(
          STYLE_VARIANTS[props.color ?? "gray"],
        ),
      )}
    />
  )
}

export function SecondaryButton(props: ButtonProps) {
  const baseStyle = "shadow-xs shadow-gray-100"

  const finalProps = mergeButtonProps(props, () =>
    baseStyle.concat(
      getColor(props.color ?? "gray", SecondaryButton.styleRecord),
    ),
  )

  return <Button {...finalProps} />
}

SecondaryButton.styleRecord = {
  gray:
    // @tw
    `
		bg-primary
		ring-2 ring-inset ring-slate-200
		text-gray-700	hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-400
		dark:hover:bg-gray-100/90 dark:active:bg-gray-100/80
		`,
  blue:
    // @tw
    `
		shadow-blue-300
		bg-blue-100 hover:bg-blue-1000/85 active:bg-blue-1000/80
		dark:hover:bg-blue-1000/90 dark:active:bg-blue-1000/80
		`,
  reimu:
    // @tw
    `
		text-reimu-700 hover:text-white active:text-white
		bg-gray-100 hover:bg-reimu-900 active:bg-reimu-1000
		`,
  marisa:
    // @tw
    `
		shadow-blue-300
		bg-blue-100 hover:bg-blue-1000/85 active:bg-blue-1000/80
		dark:hover:bg-blue-1000/90 dark:active:bg-blue-1000/80
		`,
  green:
    // @tw
    `
		shadow-blue-300
		bg-blue-100 hover:bg-blue-1000/85 active:bg-blue-1000/80
		dark:hover:bg-blue-1000/90 dark:active:bg-blue-1000/80
		`,
  slate:
    // @tw
    `
		shadow-blue-300
		bg-blue-100 hover:bg-blue-1000/85 active:bg-blue-1000/80
		dark:hover:bg-blue-1000/90 dark:active:bg-blue-1000/80
		`,
} as Record<ValidColor, string>
twMerge("")
export function TertiaryButton(props: ButtonProps) {
  const finalProps = mergeButtonProps(props, () =>
    TertiaryButton.getStyle(props.color ?? "gray"),
  )

  return <Button {...finalProps} />
}

TertiaryButton.baseStyle = `
		bg-primary hover:bg-gray-100 active:bg-gray-200 disabled:bg-gray-300 [&_svg]:text-tertiary`
TertiaryButton.styleRecord = {
  gray:
    // @tw
    `
		text-gray-800 disabled:text-gray-600
		disabled:shadow-xs
		`,
  blue:
    // @tw
    `
		text-blue-700
		disabled:bg-gray-300
		`,
  reimu:
    // @tw
    `
		text-blue-700
		disabled:bg-gray-300
		`,
  marisa:
    // @tw
    `
		text-reimu-700
		disabled:bg-gray-300
		`,
  green:
    // @tw
    `
		text-reimu-700
		disabled:bg-gray-300
		`,
  slate:
    // @tw
    `
		text-reimu-700
		disabled:bg-gray-300
		`,
} as Record<ValidColor, string>
TertiaryButton.getStyle = (color: ExtendedValidColor) =>
  TertiaryButton.baseStyle.concat(getColor(color, TertiaryButton.styleRecord))
