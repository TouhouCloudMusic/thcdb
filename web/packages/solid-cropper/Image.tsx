import "cropperjs"

import type { CropperElement, TransformationMatrix } from "./type"

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
}

export interface ImageElement extends CropperElement, ImageProps {
	$ready(
		callback?: (image: HTMLImageElement) => void,
	): Promise<HTMLImageElement>
	$center(size?: InitialCenterSize): ImageElement
	$move(x: number, y?: number): ImageElement
	$moveTo(x: number, y?: number): ImageElement
	$rotate(angle: number | string, x?: number, y?: number): ImageElement
	$zoom(scale: number, x?: number, y?: number): ImageElement
	$scale(x: number, y?: number): ImageElement
	$skew(x: number | string, y?: number | string): ImageElement
	$translate(x: number, y?: number): ImageElement
	$transform(
		a: number,
		b: number,
		c: number,
		d: number,
		e: number,
		f: number,
	): ImageElement
	$setTransform(
		a: number | TransformationMatrix,
		b?: number,
		c?: number,
		d?: number,
		e?: number,
		f?: number,
	): ImageElement
	$getTransform(): TransformationMatrix
	$resetTransform(): ImageElement
}

export function Image(props: ImageProps) {
	// @ts-expect-error
	return <cropper-image {...props} />
}
