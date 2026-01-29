import "cropperjs"
import type { JSX } from "solid-js"

import type { ActionType } from "./type"

export type HandleProps = {
	action?: ActionType
	plain?: boolean
	slottable?: boolean
	themeColor?: string
}

export function Handle(props: HandleProps) {
	return <cropper-handle {...props}></cropper-handle>
}
