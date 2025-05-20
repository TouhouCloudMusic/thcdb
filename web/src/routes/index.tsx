import { createFileRoute } from "@tanstack/solid-router"
import { HomePage } from "~/views/Homepage"

export const Route = createFileRoute("/")({ 
	component: HomePage, 
})
