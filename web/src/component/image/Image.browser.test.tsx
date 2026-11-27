import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import { http, HttpResponse } from "msw/http"
import { createSignal } from "solid-js"
import { afterEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { Dialog } from "~/component/dialog"
import { I18NProvider } from "~/state/i18n"
import { worker } from "~/test/browser"

import { Image } from "."

const artwork =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>'
const artworkDataUrl = `data:image/svg+xml,${encodeURIComponent(artwork)}`
const fallbackLabels = {
	[Image.State.Loading]: "Loading",
	[Image.State.Error]: "Failed",
	[Image.State.Missing]: "Missing",
}

describe("image", () => {
	afterEach(cleanup)

	it("shows the fallback for the current image source", async () => {
		expect.hasAssertions()
		const [src, setSrc] = createSignal<string>()
		render(() => (
			<Image.Root url={src()}>
				<Image.Fallback>
					{(state) => <output>{fallbackLabels[state]}</output>}
				</Image.Fallback>
				<Image.Img alt="Artwork" />
			</Image.Root>
		))
		expect(screen.getByRole("status")).toHaveTextContent("Missing")

		setSrc("data:image/png,invalid")
		await expect(screen.findByText("Failed")).resolves.toBeVisible()

		setSrc(artworkDataUrl)
		expect(screen.getByRole("status")).toHaveTextContent("Loading")
		await waitFor(() =>
			expect(screen.queryByRole("status")).not.toBeInTheDocument(),
		)
		expect(screen.getByRole("img", { name: "Artwork" })).toBeVisible()

		setSrc(undefined)
		expect(screen.getByRole("status")).toHaveTextContent("Missing")
	})

	it("opens the original from a thumbnail", async () => {
		expect.hasAssertions()
		const pathname = "/api/public/image/artwork.svg"
		const originalUrl = new URL(pathname, globalThis.location.href)
		worker.use(
			http.get(
				`*${pathname}`,
				() =>
					new HttpResponse(artwork, {
						headers: { "Content-Type": "image/svg+xml" },
					}),
			),
		)

		render(() => (
			<I18NProvider initialLocale="en">
				<Image.Root
					url="artwork.svg"
					size={6}
				>
					<Image.Preview alt="Original artwork">
						<Dialog.Trigger
							type="button"
							aria-label="Enlarge artwork"
						>
							<Image.Img alt="Artwork thumbnail" />
						</Dialog.Trigger>
					</Image.Preview>
				</Image.Root>
			</I18NProvider>
		))

		const thumbnail = screen.getByRole("img", { name: "Artwork thumbnail" })
		expect(thumbnail).toHaveAttribute("src", `${originalUrl.href}?size=6&v=1`)

		await userEvent.click(
			screen.getByRole("button", { name: "Enlarge artwork" }),
		)
		const preview = await screen.findByRole("dialog", {
			name: "Enlarged image",
		})
		expect(
			within(preview).getByRole("img", { name: "Original artwork" }),
		).toHaveAttribute("src", originalUrl.href)
	})
})
