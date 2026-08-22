import { useLingui } from "@lingui/solid/macro"
import { Navigate } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { Match, Switch } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { hasAdminRole } from "~/domain/user/authorization"
import { useCurrentUser } from "~/state/user"

export function SessionLoading() {
	const { t } = useLingui()
	return (
		<div class="grid min-h-[60vh] place-items-center px-6 py-14">
			<div class="rounded-sm border border-slate-300 bg-white px-5 py-4 text-sm text-slate-500 shadow-xs">
				{t`Checking session…`}
			</div>
		</div>
	)
}

function AuthRequired() {
	const { t } = useLingui()
	return (
		<div class="grid min-h-[60vh] place-items-center px-6 py-14">
			<div class="w-full max-w-md rounded-sm border border-slate-300 bg-white p-6 shadow-xs">
				<div class="text-xs font-medium tracking-[0.22em] text-slate-500">
					{t`AUTH REQUIRED`}
				</div>
				<div class="mt-3 text-lg font-light text-slate-900">
					{t`Sign in to continue`}
				</div>
				<div class="mt-1 text-sm text-slate-500">
					{t`This page requires an authenticated account.`}
				</div>

				<div class="mt-5 flex flex-wrap gap-3">
					<Link
						to="/auth"
						search={{ type: "sign_in" }}
						class="no-underline hover:no-underline"
					>
						<Button
							variant="Primary"
							color="Reimu"
						>
							{t`Sign in`}
						</Button>
					</Link>
					<Link
						to="/auth"
						search={{ type: "sign_up" }}
						class="no-underline hover:no-underline"
					>
						<Button
							variant="Secondary"
							color="Slate"
						>
							{t`Create account`}
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}

export function AuthGuard(props: ParentProps) {
	const userCtx = useCurrentUser()

	return (
		<Switch fallback={<AuthRequired />}>
			<Match when={userCtx.session.status === "loading"}>
				<SessionLoading />
			</Match>
			<Match when={userCtx.session.status === "authenticated"}>
				{props.children}
			</Match>
		</Switch>
	)
}

export function AdminGuard(props: ParentProps) {
	const userCtx = useCurrentUser()

	return (
		<Switch fallback={<Navigate to="/" />}>
			<Match when={userCtx.session.status === "loading"}>
				<SessionLoading />
			</Match>
			<Match when={hasAdminRole(userCtx.authorization)}>{props.children}</Match>
		</Switch>
	)
}
