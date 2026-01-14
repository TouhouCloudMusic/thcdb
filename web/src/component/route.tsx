import type { ParentProps } from "solid-js"
import { Match, Switch } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { useCurrentUser } from "~/state/user"

export function AuthGuard(props: ParentProps) {
	const user_ctx = useCurrentUser()
	return (
		<Switch>
			<Match when={user_ctx.user}>{props.children}</Match>

			<Match when={user_ctx.is_loading}>
				<div class="grid min-h-[60vh] place-items-center px-6 py-14">
					<div class="rounded-sm border border-slate-300 bg-white px-5 py-4 text-sm text-slate-500 shadow-xs">
						Checking session…
					</div>
				</div>
			</Match>

			<Match when={true}>
				<div class="grid min-h-[60vh] place-items-center px-6 py-14">
					<div class="w-full max-w-md rounded-sm border border-slate-300 bg-white p-6 shadow-xs">
						<div class="text-xs font-medium tracking-[0.22em] text-slate-500">
							AUTH REQUIRED
						</div>
						<div class="mt-3 text-lg font-light text-slate-900">
							Sign in to continue
						</div>
						<div class="mt-1 text-sm text-slate-500">
							This page requires an authenticated account.
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
									Sign in
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
									Create account
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</Match>
		</Switch>
	)
}
