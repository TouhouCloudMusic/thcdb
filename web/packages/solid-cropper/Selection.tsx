import "cropperjs"
import { mergeProps } from "solid-js"
import type { JSX, ParentProps } from "solid-js"

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
	onChange?: JSX.EventHandlerUnion<HTMLElement, CustomEvent>
}

export function Selection(props: ParentProps<SelectionProps>) {
	const localProps = mergeProps(props, {
		get "aspect-ratio"() {
			return props.aspectRatio
		},
		get "initial-aspect-ratio"() {
			return props.initialAspectRatio
		},
		get "initial-coverage"() {
			return props.initialCoverage
		},
	})

	// @ts-ignore
	return <cropper-selection {...localProps}></cropper-selection>
}
