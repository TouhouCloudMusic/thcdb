import { afterEach, beforeAll } from "vitest"

import { worker } from "./browser"

beforeAll(async () => {
	await worker.start({ onUnhandledFrame: "error" })
})

afterEach(() => worker.resetHandlers())
