import { NumExt } from "@thc/toolkit/data"
import type { CropperSelection } from "cropperjs"

import { clampRectToBounds } from "./cropperGeometry"
import type { Rect } from "./cropperGeometry"

const patchedSelections = new WeakSet<CropperSelection>()

const normalizeSizeToRatioCover = (
	width: number,
	height: number,
	ratio: number | undefined,
) => {
	if (!ratio || ratio <= 0) return { width, height }
	if (!Number.isFinite(width) || width <= 0) return { width, height }
	if (!Number.isFinite(height) || height <= 0) return { width, height }

	const projectedWidth = height * ratio
	if (projectedWidth < width) {
		return { width, height: width / ratio }
	}
	return { width: projectedWidth, height }
}

export const ensureCropperSelectionChangeBounded = (options: {
	selection: CropperSelection
	ratio: number | undefined
	getBounds: () => Rect | undefined
}) => {
	const selection = options.selection
	if (patchedSelections.has(selection)) return
	patchedSelections.add(selection)

	let adjusting = false

	const onChange = (event: Event) => {
		if (adjusting) return
		if (!(event instanceof CustomEvent)) return

		const xValue = NumExt.toFinite(event.detail?.x)
		const yValue = NumExt.toFinite(event.detail?.y)
		const widthValue = NumExt.toFinite(event.detail?.width) ?? 0
		const heightValue = NumExt.toFinite(event.detail?.height) ?? 0
		if (xValue === undefined || yValue === undefined) return
		if (widthValue <= 0 || heightValue <= 0) return

		const bounds = options.getBounds()
		if (!bounds) return

		const normalized = normalizeSizeToRatioCover(
			widthValue,
			heightValue,
			options.ratio,
		)
		const next = clampRectToBounds(
			{
				x: xValue,
				y: yValue,
				width: normalized.width,
				height: normalized.height,
			},
			bounds,
			options.ratio,
		)

		if (
			next.x === xValue
			&& next.y === yValue
			&& next.width === widthValue
			&& next.height === heightValue
		) {
			return
		}

		event.preventDefault()
		adjusting = true
		try {
			selection.$change(
				next.x,
				next.y,
				next.width,
				next.height,
				options.ratio,
				true,
			)
		} finally {
			adjusting = false
		}
	}

	selection.addEventListener("change", onChange)
}
