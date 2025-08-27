import "cropperjs"
import type { JSX } from "solid-js"

export interface ShadeProps extends JSX.HTMLAttributes<HTMLElement> {
	x?: number
	y?: number
	width?: number
	height?: number
	slottable?: boolean
	themeColor?: string
}

export function Shade(props: ShadeProps) {
	// @ts-expect-error
	return <cropper-shade {...props} />
}
