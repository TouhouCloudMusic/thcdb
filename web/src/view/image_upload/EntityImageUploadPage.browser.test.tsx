import { cleanup, render, screen } from "@solidjs/testing-library"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"

import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "./EntityImageUploadPage"
import type { EntityImageUploadStoreOptions } from "./store"

describe("image upload", () => {
	afterEach(cleanup)

	it("requires a description and submits it with the selected image", async () => {
		expect.hasAssertions()
		await loadLocale("en")
		const router = createRouter({
			routeTree: createRootRoute(),
			history: createMemoryHistory({ initialEntries: ["/"] }),
		})
		const file = new File(["image"], "cover.png", { type: "image/png" })
		const onUpload = vi
			.fn<EntityImageUploadStoreOptions["onUpload"]>()
			.mockResolvedValue(undefined)

		function UploadPage() {
			const store = createEntityImageUploadStore({
				initialDraftFile: file,
				onUpload,
			})
			return (
				<EntityImageUploadPage
					entityLabel="Release"
					entityId="1"
					entityName="Lovelight"
					imageLabel="cover"
					dimensionRange={{
						width: { min: 1, max: 2048 },
						height: { min: 1, max: 2048 },
					}}
					fileSizeRange={{ min: 1, max: 1024 }}
					store={store}
				/>
			)
		}

		render(() => (
			<RouterContextProvider router={router}>
				{() => (
					<I18NProvider initialLocale="en">
						<UploadPage />
					</I18NProvider>
				)}
			</RouterContextProvider>
		))

		const description = await screen.findByRole("textbox", {
			name: "Description",
		})
		const submit = screen.getByRole("button", { name: "Submit" })
		await userEvent.fill(description, "  \t")
		expect(submit).toBeDisabled()

		await userEvent.fill(description, "Scanned from the original booklet.")
		await userEvent.click(submit)
		expect(onUpload).toHaveBeenCalledExactlyOnceWith({
			file,
			description: "Scanned from the original booklet.",
		})
	})
})
