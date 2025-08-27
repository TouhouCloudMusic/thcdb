// oxlint-disable require-param
// oxlint-disable require-returns
// oxlint-disable max-params
// oxlint-disable no-magic-numbers
// oxlint-disable prefer-reflect-apply
// oxlint-disable prefer-rest-params
// oxlint-disable no-explicit-any
// oxlint-disable no-undef
// oxlint-disable func-names
// oxlint-disable func-style

/**
 * MIT License
 *
 * Copyright (c) 2023 Effectful Technologies Inc
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Source: https://github.com/Effect-TS/effect
 */

export const dual: {
	<
		DataLast extends (...args: any[]) => any,
		DataFirst extends (...args: any[]) => any,
	>(
		arity: Parameters<DataFirst>["length"],
		body: DataFirst,
	): DataLast & DataFirst
	<
		DataLast extends (...args: any[]) => any,
		DataFirst extends (...args: any[]) => any,
	>(
		isDataFirst: (args: IArguments) => boolean,
		body: DataFirst,
	): DataLast & DataFirst
} = function (arity, body) {
	if (typeof arity === "function") {
		return function () {
			if (arity(arguments)) {
				// @ts-expect-error
				return body.apply(this, arguments)
			}
			return ((self: any) => body(self, ...arguments)) as any
		}
	}

	switch (arity) {
		case 0:
		case 1: {
			throw new RangeError(`Invalid arity ${arity}`)
		}

		case 2: {
			return function (a, b) {
				if (arguments.length >= 2) {
					return body(a, b)
				}
				return function (self: any) {
					return body(self, a)
				}
			}
		}

		case 3: {
			return function (a, b, c) {
				if (arguments.length >= 3) {
					return body(a, b, c)
				}
				return function (self: any) {
					return body(self, a, b)
				}
			}
		}

		case 4: {
			return function (a, b, c, d) {
				if (arguments.length >= 4) {
					return body(a, b, c, d)
				}
				return function (self: any) {
					return body(self, a, b, c)
				}
			}
		}

		case 5: {
			return function (a, b, c, d, e) {
				if (arguments.length >= 5) {
					return body(a, b, c, d, e)
				}
				return function (self: any) {
					return body(self, a, b, c, d)
				}
			}
		}

		default: {
			return function () {
				if (arguments.length >= arity) {
					// @ts-expect-error
					return body.apply(this, arguments)
				}
				const args = arguments
				return function (self: any) {
					return body(self, ...args)
				}
			}
		}
	}
}
