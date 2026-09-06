import { createFileRoute } from "@tanstack/solid-router"

import { ResetPasswordSuccessPage } from "~/view/auth/reset_password/success"

export const Route = createFileRoute("/auth/reset-password/success")({
	component: ResetPasswordSuccessPage,
})
