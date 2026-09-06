import { createFileRoute } from "@tanstack/solid-router"

import { ResetPasswordPage } from "~/view/auth/reset_password"

export const Route = createFileRoute("/auth/reset-password/")({
	component: RouteComponent,
})

function RouteComponent() {
	return <ResetPasswordPage />
}
