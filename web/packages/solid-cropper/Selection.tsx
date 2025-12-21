import "cropperjs"
import type { ParentProps } from "solid-js"

export type SelectionProps = {
	x?: number
	y?: number
	width?: number
	height?: number
	aspectRatio?: number
	initialAspectRatio?: number
	initialCoverage?: number
	dynamic?: boolean
	movable?: boolean
	resizable?: boolean
	zoomable?: boolean
	multiple?: boolean
	keyboard?: boolean
	outlined?: boolean
	precise?: boolean
}

export function Selection(props: ParentProps<SelectionProps>) {
	// @ts-expect-error
	return <cropper-selection {...props} />
}
