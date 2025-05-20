import { createFileRoute } from "@tanstack/solid-router"
import { type } from "arktype"

import { Auth } from "~/views/auth"

const AuthenSearchSchema = type({
	type: "'sign_in' | 'sign_up'",
})

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
	validateSearch: AuthenSearchSchema,
})

function RouteComponent() {
	return <Auth />
}
