import "cropperjs"
import type { ComponentProps, ParentProps } from "solid-js"

export interface CanvasProps extends ComponentProps<"canvas"> {
	/**
	 * Indicates whether this element has a grid background.
	 * @default false
	 */
	background?: boolean
	/**
	 * Indicates whether this element is disabled.
	 * @default false
	 */
	disabled?: boolean
	/**
	 * Indicates the stepping interval of the scaling factor when zooming in/out by wheeling, must a positive number.
	 * @default 0.1
	 */
	scaleStep?: number
	/**
	 * Indicates the primary color of this element and its children.
	 * @default "#39f"
	 */
	themeColor?: string
}

export function Canvas(props: CanvasProps) {
	// @ts-expect-error
	return <cropper-canvas {...props} />
}
