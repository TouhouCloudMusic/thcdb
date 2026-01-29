export type Rect = {
	x: number
	y: number
	width: number
	height: number
}

export type Size = {
	width: number
	height: number
}

export type Point = {
	x: number
	y: number
}

export const clampValue = (value: number, min: number, max: number) => {
	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		return Number.isFinite(value) ? value : 0
	}
	if (min > max) {
		return Number.isFinite(value) ? value : min
	}
	if (!Number.isFinite(value)) return min
	if (value < min) return min
	if (value > max) return max
	return value
}

const fitSizeToBounds = (
	size: Size,
	bounds: Rect,
	ratio: number | undefined,
): Size => {
	if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
		return size
	}

	if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) {
		return size
	}

	let nextWidth = size.width
	let nextHeight = size.height

	if (ratio && ratio > 0) {
		if (nextWidth > bounds.width || nextHeight > bounds.height) {
			if (bounds.width / bounds.height > ratio) {
				nextHeight = bounds.height
				nextWidth = bounds.height * ratio
			} else {
				nextWidth = bounds.width
				nextHeight = bounds.width / ratio
			}
		}
	} else {
		if (nextWidth > bounds.width) nextWidth = bounds.width
		if (nextHeight > bounds.height) nextHeight = bounds.height
	}

	return { width: nextWidth, height: nextHeight }
}

const clampPositionToBounds = (
	position: Point,
	size: Size,
	bounds: Rect,
): Point => {
	const maxX = bounds.x + bounds.width - size.width
	const maxY = bounds.y + bounds.height - size.height

	const safeMaxX = Number.isFinite(maxX) ? maxX : bounds.x
	const safeMaxY = Number.isFinite(maxY) ? maxY : bounds.y

	return {
		x: clampValue(position.x, bounds.x, safeMaxX),
		y: clampValue(position.y, bounds.y, safeMaxY),
	}
}

const createFallbackRect = (bounds: Rect, ratio: number | undefined): Rect => {
	if (!ratio || ratio <= 0) {
		return {
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
		}
	}

	const ratioWidth = bounds.height * ratio
	if (ratioWidth <= bounds.width) {
		return {
			x: bounds.x,
			y: bounds.y,
			width: ratioWidth,
			height: bounds.height,
		}
	}

	const ratioHeight = bounds.width / ratio
	return { x: bounds.x, y: bounds.y, width: bounds.width, height: ratioHeight }
}

export const clampRectToBounds = (
	rect: Rect,
	bounds: Rect,
	ratio: number | undefined,
): Rect => {
	if (
		!Number.isFinite(bounds.x)
		|| !Number.isFinite(bounds.y)
		|| !Number.isFinite(bounds.width)
		|| !Number.isFinite(bounds.height)
		|| bounds.width <= 0
		|| bounds.height <= 0
	) {
		return rect
	}

	if (
		!Number.isFinite(rect.x)
		|| !Number.isFinite(rect.y)
		|| !Number.isFinite(rect.width)
		|| !Number.isFinite(rect.height)
		|| rect.width <= 0
		|| rect.height <= 0
	) {
		const fallback = createFallbackRect(bounds, ratio)
		return clampRectToBounds(fallback, bounds, ratio)
	}

	const size = fitSizeToBounds(
		{ width: rect.width, height: rect.height },
		bounds,
		ratio,
	)
	const position = clampPositionToBounds({ x: rect.x, y: rect.y }, size, bounds)

	if (
		!Number.isFinite(position.x)
		|| !Number.isFinite(position.y)
		|| !Number.isFinite(size.width)
		|| !Number.isFinite(size.height)
		|| size.width <= 0
		|| size.height <= 0
	) {
		return createFallbackRect(bounds, ratio)
	}

	return {
		x: position.x,
		y: position.y,
		width: size.width,
		height: size.height,
	}
}
