import { createFileRoute } from "@tanstack/solid-router"

import { SignUpPage } from "~/view/auth/sign_up"
export const Route = createFileRoute("/auth/sign-up")({ component: SignUpPage })
