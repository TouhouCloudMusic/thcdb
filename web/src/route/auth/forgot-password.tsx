import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { ResetPasswordPage } from "~/view/auth/reset_password"

const searchSchema = v.object({
	step: v.optional(v.picklist(["reset", "success"])),
})

export const Route = createFileRoute("/auth/forgot-password")({
	component: RouteComponent,
	validateSearch: searchSchema,
})

function RouteComponent() {
	const search = Route.useSearch()

	return <ResetPasswordPage step={search().step} />
}
