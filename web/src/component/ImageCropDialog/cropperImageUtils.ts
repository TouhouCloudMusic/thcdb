import { NumExt } from "@thc/toolkit/data"
import { CropperImage } from "cropperjs"

import type { Rect } from "./cropperGeometry"

export type ImageScale = {
	scaleX: number
	scaleY: number
}

export const getImageScale = (host: HTMLDivElement): ImageScale | undefined => {
	const image = host.querySelector("cropper-image")
	if (!(image instanceof CropperImage)) return

	const matrix = image.$getTransform()

	const a = NumExt.toFinite(matrix[0]) ?? 1
	const b = NumExt.toFinite(matrix[1]) ?? 0
	const c = NumExt.toFinite(matrix[2]) ?? 0
	const d = NumExt.toFinite(matrix[3]) ?? 1
	const scaleX = Math.hypot(a, b)
	const scaleY = Math.hypot(c, d)
	if (!Number.isFinite(scaleX) || scaleX <= 0) return
	if (!Number.isFinite(scaleY) || scaleY <= 0) return
	return { scaleX, scaleY }
}

export const getImageBounds = (host: HTMLDivElement): Rect | undefined => {
	const canvas = host.querySelector("cropper-canvas")
	const image = host.querySelector("cropper-image")
	if (!(canvas instanceof HTMLElement) || !(image instanceof HTMLElement))
		return

	const canvasRect = canvas.getBoundingClientRect()
	const imageRect = image.getBoundingClientRect()

	const left = Math.max(imageRect.left, canvasRect.left)
	const top = Math.max(imageRect.top, canvasRect.top)
	const right = Math.min(imageRect.right, canvasRect.right)
	const bottom = Math.min(imageRect.bottom, canvasRect.bottom)

	const width = right - left
	const height = bottom - top
	if (!Number.isFinite(width) || !Number.isFinite(height)) return
	if (width <= 0 || height <= 0) return

	return {
		x: left - canvasRect.left,
		y: top - canvasRect.top,
		width,
		height,
	}
}
