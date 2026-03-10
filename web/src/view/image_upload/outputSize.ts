export type OutputSize = {
	width: number
	height: number
}

export type ScaleRange = {
	min: number
	max: number
}

export type ImageDimensionRange = {
	width: ScaleRange
	height: ScaleRange
}

function isFinitePositive(value: number) {
	return Number.isFinite(value) && value > 0
}

// A rounded output size N is reachable exactly when scale falls into
// `[(N - 0.5) / rawSize, (N + 0.5) / rawSize)`.
function ScaleRange_fromRoundedOutputBounds(
	self: ScaleRange,
	rawSize: number,
): ScaleRange {
	return {
		min: Math.max(0, (self.min - 0.5) / rawSize),
		max: (self.max + 0.5) / rawSize,
	}
}

function ScaleRange_getMaxValueBelowUpperBound(self: ScaleRange) {
	// The upper bound is exclusive for rounded outputs, so stay just below it.
	const epsilon = Number.EPSILON * Math.max(1, Math.abs(self.max))
	return Math.max(self.min, self.max - epsilon)
}

function ScaleRange_tryIntersect(
	self: ScaleRange,
	other: ScaleRange,
): ScaleRange | undefined {
	const min = Math.max(self.min, other.min)
	const max = Math.min(self.max, other.max)

	if (min >= max) return

	return { min, max }
}

function ImageDimensionRange_getAllowedScaleRange(
	self: ImageDimensionRange,
	rawWidth: number,
	rawHeight: number,
) {
	const widthScaleRange = ScaleRange_fromRoundedOutputBounds(
		self.width,
		rawWidth,
	)
	const heightScaleRange = ScaleRange_fromRoundedOutputBounds(
		self.height,
		rawHeight,
	)

	return ScaleRange_tryIntersect(widthScaleRange, heightScaleRange)
}

function ImageDimensionRange_resolveScale(
	self: ImageDimensionRange,
	rawWidth: number,
	rawHeight: number,
	scaleRange: ScaleRange,
) {
	// Prefer keeping the crop at its current scale whenever that already fits.
	if (scaleRange.min <= 1 && scaleRange.max > 1) return 1

	const preferredMinScale = Math.max(
		self.width.min / rawWidth,
		self.height.min / rawHeight,
	)
	const preferredMaxScale = Math.min(
		self.width.max / rawWidth,
		self.height.max / rawHeight,
	)

	if (preferredMinScale > 1) {
		return Math.min(
			preferredMinScale,
			ScaleRange_getMaxValueBelowUpperBound(scaleRange),
		)
	}

	return Math.max(preferredMaxScale, scaleRange.min)
}

export function computeOutputSize(
	rawWidth: number,
	rawHeight: number,
	dimensionRange: ImageDimensionRange,
): OutputSize | undefined {
	if (!isFinitePositive(rawWidth) || !isFinitePositive(rawHeight)) return

	const scaleRange = ImageDimensionRange_getAllowedScaleRange(
		dimensionRange,
		rawWidth,
		rawHeight,
	)
	if (!scaleRange) return

	const scale = ImageDimensionRange_resolveScale(
		dimensionRange,
		rawWidth,
		rawHeight,
		scaleRange,
	)
	const width = Math.round(rawWidth * scale)
	const height = Math.round(rawHeight * scale)

	return { width, height }
}
