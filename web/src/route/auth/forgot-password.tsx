import { createFileRoute } from "@tanstack/solid-router"

import { ForgotPasswordPage } from "~/view/auth/reset_password/forgot_password"

export const Route = createFileRoute("/auth/forgot-password")({
	component: RouteComponent,
})

function RouteComponent() {
	return <ForgotPasswordPage />
}
