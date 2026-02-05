import "cropperjs"
import type { JSX } from "solid-js"

export type ResizeDirection = "both" | "horizontal" | "vertical" | "none"

export type ViewerProps = {
	resize?: ResizeDirection
	selection?: string
	slottable?: boolean
}

export function Viewer(props: ViewerProps) {
	// @ts-ignore
	return <cropper-viewer {...props}></cropper-viewer>
}
