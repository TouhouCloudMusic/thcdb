import { describe, expect, it, vi } from "vitest"

import { imgUrl } from "./static_file"

describe("static image url adapter", () => {
	it("uses same-origin api image path for relative image paths", () => {
		vi.stubGlobal("location", new URL("http://localhost:3000/image-queue/1"))

		expect(imgUrl("ab/cd/test.png")).toBe(
			"http://localhost:3000/api/public/image/ab/cd/test.png",
		)
	})

	it("passes through absolute urls", () => {
		expect(imgUrl("https://cdn.example.com/image.png")).toBe(
			"https://cdn.example.com/image.png",
		)
	})
})
