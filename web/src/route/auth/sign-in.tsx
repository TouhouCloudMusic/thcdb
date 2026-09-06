import { createFileRoute } from "@tanstack/solid-router"

import { SignInPage } from "~/view/auth/sign_in"
export const Route = createFileRoute("/auth/sign-in")({ component: SignInPage })
