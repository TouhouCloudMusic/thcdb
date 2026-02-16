import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { Auth } from "~/view/auth"

const authSearchSchema = v.object({
	type: v.fallback(
		v.picklist(["sign_in", "sign_up", "verify_email"]),
		"sign_in",
	),
	email: v.optional(v.string()),
})

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
	validateSearch: authSearchSchema,
})

function RouteComponent() {
	return <Auth />
}
