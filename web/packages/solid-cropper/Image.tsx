import "cropperjs";
import type { JSX } from "solid-js";















export type InitialCenterSize = "contain" | "cover"

export interface ImageProps {
	initialCenterSize?: InitialCenterSize
	rotatable?: boolean
	scalable?: boolean
	skewable?: boolean
	slottable?: boolean
	translatable?: boolean

	alt?: string
	crossOrigin?: string | null
	decoding?: string
	loading?: string
	referrerPolicy?: string
	sizes?: string
	src?: string
	srcset?: string
	onTransform?: JSX.EventHandlerUnion<HTMLElement, CustomEvent>
}

export function Image(props: ImageProps) {
	return (
		// @ts-ignore
		<cropper-image
			{...props}
			initial-center-size={props.initialCenterSize}
		/>
	)
}
