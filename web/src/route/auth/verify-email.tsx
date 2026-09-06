import { createFileRoute } from "@tanstack/solid-router"

import { VerifyEmailPage } from "~/view/auth/verify_email"
export const Route = createFileRoute("/auth/verify-email")({
	component: VerifyEmailPage,
})
