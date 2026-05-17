import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { computeOutputSize } from "./outputSize"

function createPositiveIntArb() {
	return fc.integer({ min: 1, max: 4096 })
}

function createDimensionRangeArb() {
	const positiveIntArb = createPositiveIntArb()

	return fc
		.record({
			minWidth: positiveIntArb,
			widthDelta: fc.integer({ min: 0, max: 4096 }),
			minHeight: positiveIntArb,
			heightDelta: fc.integer({ min: 0, max: 4096 }),
		})
		.map(({ minWidth, widthDelta, minHeight, heightDelta }) => ({
			width: {
				min: minWidth,
				max: minWidth + widthDelta,
			},
			height: {
				min: minHeight,
				max: minHeight + heightDelta,
			},
		}))
}

describe("output size computation", () => {
	// oxlint-disable-next-line vitest/prefer-expect-assertions
	it("keeps dimensions unchanged when they are already valid", () => {
		const validInputArb = createDimensionRangeArb().chain((range) =>
			fc.record({
				rawWidth: fc.integer({
					min: range.width.min,
					max: range.width.max,
				}),
				rawHeight: fc.integer({
					min: range.height.min,
					max: range.height.max,
				}),
				range: fc.constant(range),
			}),
		)

		fc.assert(
			fc.property(validInputArb, ({ rawWidth, rawHeight, range }) => {
				expect(computeOutputSize(rawWidth, rawHeight, range)).toStrictEqual({
					width: rawWidth,
					height: rawHeight,
				})
			}),
		)
	})

	// oxlint-disable-next-line vitest/prefer-expect-assertions
	it("scales down proportionally instead of distorting", () => {
		const exactDownscaleCaseArb = fc
			.record({
				width: fc.integer({ min: 1, max: 2048 }),
				height: fc.integer({ min: 1, max: 2048 }),
				scale: fc.integer({ min: 2, max: 8 }),
				minWidthSlack: fc.integer({ min: 0, max: 2047 }),
				minHeightSlack: fc.integer({ min: 0, max: 2047 }),
			})
			.map(({ width, height, scale, minWidthSlack, minHeightSlack }) => ({
				rawWidth: width * scale,
				rawHeight: height * scale,
				range: {
					width: {
						min: Math.max(1, width - minWidthSlack),
						max: width,
					},
					height: {
						min: Math.max(1, height - minHeightSlack),
						max: height,
					},
				},
				expected: {
					width,
					height,
				},
			}))

		fc.assert(
			fc.property(
				exactDownscaleCaseArb,
				({ rawWidth, rawHeight, range, expected }) => {
					expect(computeOutputSize(rawWidth, rawHeight, range)).toStrictEqual(
						expected,
					)
				},
			),
		)
	})

	// oxlint-disable-next-line vitest/prefer-expect-assertions
	it("scales up proportionally to satisfy minimum dimensions", () => {
		const exactUpscaleCaseArb = fc
			.record({
				rawWidth: fc.integer({ min: 1, max: 512 }),
				rawHeight: fc.integer({ min: 1, max: 512 }),
				scale: fc.integer({ min: 2, max: 8 }),
				maxWidthSlack: fc.integer({ min: 0, max: 2048 }),
				maxHeightSlack: fc.integer({ min: 0, max: 2048 }),
			})
			.map(({ rawWidth, rawHeight, scale, maxWidthSlack, maxHeightSlack }) => {
				const width = rawWidth * scale
				const height = rawHeight * scale

				return {
					rawWidth,
					rawHeight,
					range: {
						width: {
							min: width,
							max: width + maxWidthSlack,
						},
						height: {
							min: height,
							max: height + maxHeightSlack,
						},
					},
					expected: {
						width,
						height,
					},
				}
			})

		fc.assert(
			fc.property(
				exactUpscaleCaseArb,
				({ rawWidth, rawHeight, range, expected }) => {
					expect(computeOutputSize(rawWidth, rawHeight, range)).toStrictEqual(
						expected,
					)
				},
			),
		)
	})

	it("returns undefined when no rounded output can satisfy both bounds", () => {
		expect(
			computeOutputSize(3, 1, {
				width: { min: 1, max: 1 },
				height: { min: 2, max: 2 },
			}),
		).toBeUndefined()
	})

	it("accepts outputs that only become valid after rounding", () => {
		expect(
			computeOutputSize(1001, 1000, {
				width: { min: 333, max: 333 },
				height: { min: 333, max: 333 },
			}),
		).toStrictEqual({
			width: 333,
			height: 333,
		})
	})

	it("keeps boundary downscales inside the feasible rounded interval", () => {
		expect(
			computeOutputSize(271, 4345, {
				width: { min: 256, max: 4096 },
				height: { min: 256, max: 4096 },
			}),
		).toStrictEqual({
			width: 256,
			height: 4096,
		})
	})

	// oxlint-disable-next-line vitest/prefer-expect-assertions
	it("returns sizes within bounds whenever it succeeds", () => {
		const positiveIntArb = createPositiveIntArb()
		const dimensionRangeArb = createDimensionRangeArb()

		fc.assert(
			fc.property(
				positiveIntArb,
				positiveIntArb,
				dimensionRangeArb,
				(rawWidth, rawHeight, range) => {
					const result = computeOutputSize(rawWidth, rawHeight, range)

					if (result === undefined) return

					expect(result.width).toBeGreaterThanOrEqual(range.width.min)
					expect(result.width).toBeLessThanOrEqual(range.width.max)
					expect(result.height).toBeGreaterThanOrEqual(range.height.min)
					expect(result.height).toBeLessThanOrEqual(range.height.max)
				},
			),
		)
	})
})
