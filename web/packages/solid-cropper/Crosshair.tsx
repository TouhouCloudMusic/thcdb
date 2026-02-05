import "cropperjs"
import type { JSX } from "solid-js"

export type CropperCrosshairProps = {
	centered?: boolean
	slottable?: boolean
	themeColor?: string
}

export function CropperCrosshair(props: CropperCrosshairProps) {
	// @ts-expect-error
	return <cropper-crosshair {...props}></cropper-crosshair>
}
