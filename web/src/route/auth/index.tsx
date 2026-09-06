import { createFileRoute, redirect } from "@tanstack/solid-router"
export const Route = createFileRoute("/auth/")({
	beforeLoad: () => {
		throw redirect({ to: "/auth/sign-in", replace: true })
	},
})
