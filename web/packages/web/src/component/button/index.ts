import { JSX } from "solid-js"

export interface ButtonAttributes
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	children?: string | JSX.Element
}

export * as Button from "./buttons"
