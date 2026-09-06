import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/solid-router"
import type { Middleware } from "openapi-fetch"
import { onCleanup } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Footer } from "~/component/Footer"
import { Header } from "~/component/Header"
import { client } from "~/hey-api/client.gen"
import { Route as AuthRoute } from "~/route/auth"
import { Route as ForgotPasswordRoute } from "~/route/auth/forgot-password"
import { Route as ResetPasswordRoute } from "~/route/auth/reset-password/index"
import { Route as ResetPasswordSuccessRoute } from "~/route/auth/reset-password/success"
import { Route as SignInRoute } from "~/route/auth/sign-in"
import { Route as SignUpRoute } from "~/route/auth/sign-up"
import { Route as VerifyEmailRoute } from "~/route/auth/verify-email"
import { TanStackProvider } from "~/state/tanstack"
import { UserContextProvider } from "~/state/user"

import { FetchClient } from "../../../packages/api/src/fetch"
import {
	getResetPasswordEmail,
	saveResetPasswordEmail,
	clearResetPasswordEmail,
	getResetPasswordSession,
	saveResetPasswordSession,
	clearResetPasswordSession,
	hasResetPasswordSuccess,
	markResetPasswordSuccess,
	clearResetPasswordSuccess,
	hasResetPasswordSessionWarning,
	clearResetPasswordSessionWarning,
	markResetPasswordSessionInvalid,
} from "./reset_password/session"
import {
	getVerificationSession,
	setVerificationSession,
} from "./verify_email/session"

function authResponse(request: Request) {
	const isProfile = new URL(request.url).pathname === "/api/profile"
	return Response.json(
		{ status: "Err", message: isProfile ? "Not signed in" : "Preview only" },
		{ status: isProfile ? 401 : 501 },
	)
}

function StoryShell() {
	return (
		<div class="grid min-h-dvh grid-rows-[auto_1fr_auto]">
			<Header />
			<main>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}

const AUTH_PAGES = {
	"/auth/sign-in": SignInRoute.options.component,
	"/auth/sign-up": SignUpRoute.options.component,
	"/auth/verify-email": VerifyEmailRoute.options.component,
	"/auth/forgot-password": ForgotPasswordRoute.options.component,
	"/auth/reset-password": ResetPasswordRoute.options.component,
	"/auth/reset-password/success": ResetPasswordSuccessRoute.options.component,
}

function renderAuthStory(path: keyof typeof AUTH_PAGES) {
	const previousConfig = client.getConfig()
	const previousVerificationSession = getVerificationSession()
	const previousResetEmail = getResetPasswordEmail()
	const previousResetSession = getResetPasswordSession()
	const previousResetSuccess = hasResetPasswordSuccess()
	const previousResetWarning = hasResetPasswordSessionWarning()
	const middleware: Middleware = {
		onRequest: ({ request }) => authResponse(request),
	}
	FetchClient.use(middleware)
	client.setConfig({
		fetch: (input, init) =>
			Promise.resolve(authResponse(new Request(input, init))),
	})
	setVerificationSession(
		path === "/auth/verify-email"
			? {
					email: "reimu@example.com",
					resendAvailableAt: 0,
					requestStatus: "idle",
				}
			: undefined,
	)
	clearResetPasswordSession()
	clearResetPasswordEmail()
	clearResetPasswordSuccess()
	clearResetPasswordSessionWarning()
	if (path === "/auth/reset-password") {
		saveResetPasswordSession({
			keyExpiresMinutes: 10,
			expiresAtMs: Date.now() + 600000,
		})
	}
	if (path === "/auth/reset-password/success") markResetPasswordSuccess()
	onCleanup(() => {
		FetchClient.eject(middleware)
		client.setConfig(previousConfig)
		setVerificationSession(previousVerificationSession)
		clearResetPasswordSession()
		clearResetPasswordEmail()
		clearResetPasswordSuccess()
		clearResetPasswordSessionWarning()
		if (previousResetSession) saveResetPasswordSession(previousResetSession)
		if (previousResetEmail) saveResetPasswordEmail(previousResetEmail)
		if (previousResetSuccess) markResetPasswordSuccess()
		if (previousResetWarning) markResetPasswordSessionInvalid()
	})

	const root = createRootRoute({ component: StoryShell })
	const authLayout = createRoute({
		getParentRoute: () => root,
		path: "/auth",
		component: AuthRoute.options.component,
	})
	const page = createRoute({
		getParentRoute: () => authLayout,
		path: path.slice("/auth/".length),
		component: AUTH_PAGES[path],
	})
	const router = createRouter({
		routeTree: root.addChildren([authLayout.addChildren([page])]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})

	return (
		<TanStackProvider>
			<UserContextProvider>
				<RouterProvider router={router} />
			</UserContextProvider>
		</TanStackProvider>
	)
}

const meta = {
	title: "View/Auth",
	parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>
export const SignIn: Story = {
	render: () => renderAuthStory("/auth/sign-in"),
}

export const SignUp: Story = {
	render: () => renderAuthStory("/auth/sign-up"),
}

export const VerifyEmail: Story = {
	render: () => renderAuthStory("/auth/verify-email"),
}

export const ForgotPassword: Story = {
	render: () => renderAuthStory("/auth/forgot-password"),
}

export const ResetPassword: Story = {
	render: () => renderAuthStory("/auth/reset-password"),
}
export const ResetPasswordSuccess: Story = {
	render: () => renderAuthStory("/auth/reset-password/success"),
}
