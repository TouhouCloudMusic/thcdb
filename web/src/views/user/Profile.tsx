/* @refresh skip */
import { Link } from "@tanstack/solid-router"
import {
	type ComponentProps,
	createContext,
	createSignal,
	ErrorBoundary,
	For,
	Match,
	mergeProps,
	type Resource,
	Show,
	Suspense,
	Switch,
} from "solid-js"
import { type DOMElement } from "solid-js/jsx-runtime"
import { twJoin, twMerge } from "tailwind-merge"
import { type UserRole, type UserProfile } from "~/api/user"
import { Avatar } from "~/components/avatar"
import { Button } from "~/components/button"
import { Markdown } from "~/components/markdown"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"
import { assertContext } from "~/utils/context"
import { callHandlerUnion } from "~/utils/dom/event"

type Props = {
	data: Resource<UserProfile>
	isCurrentUser: boolean
}

type Context = {
	user: Resource<UserProfile>
	userType: UserType
}

const Context = createContext<Context>()

const enum UserType {
	Current,
	Following,
	Unfollowed,
}

export function Profile(props: Props) {
	const contextValue: Context = {
		get user() {
			return props.data
		},
		get userType() {
			if (props.isCurrentUser) {
				return UserType.Current
			} else if (this.user()?.is_following) {
				return UserType.Following
			} else {
				return UserType.Unfollowed
			}
		},
	}

	return (
		<Context.Provider value={contextValue}>
			<Content />
		</Context.Provider>
	)
}

function Content() {
	const context = assertContext(Context)

	return (
		<PageLayout class="isolate">
			{/* Profile banner */}
			<div
				class={twJoin(
					"flex h-68 w-full overflow-hidden bg-slate-200",
					context.user.loading && "animate-pulse",
				)}
			>
				<Suspense>
					<ErrorBoundary
						fallback={(e) => {
							return <div>Image Error: {e}</div>
						}}
					>
						<Show when={!context.user.error && context.user.latest?.banner_url}>
							{(url) => (
								<img
									src={imgUrl(url())}
									class="size-full object-cover object-center"
									alt="Banner of the user profile"
								/>
							)}
						</Show>
					</ErrorBoundary>
				</Suspense>
			</div>

			<div class="bg-white px-8 pb-8">
				<div class="grid auto-rows-auto grid-cols-12 gap-4 px-4">
					{/* Avatar */}
					<ProfileAvatar />
					<div class="col-span-full col-start-4 mx-2 my-4 rounded-xl">
						<div class="flex items-baseline">
							<UserName />
							<ProfileButton />
						</div>
						<ul class="mt-1 flex gap-2">
							<For
								each={context.user()?.roles.concat([
									{
										id: 123,
										name: "Moderator",
									},
								])}
							>
								{(role) => (
									<li>
										<RoleBadge role={role.name} />
									</li>
								)}
							</For>
						</ul>
					</div>

					<Suspense fallback={<div>WTF</div>}>
						<Bio />
					</Suspense>

					<div class="col-span-9">
						<div class="mb-2 font-bold text-slate-700">Timeline</div>
						<div class="min-h-[1024px] rounded-xl bg-slate-100 p-4">
							<ul class="space-y-2 text-sm text-slate-600">
								{
									// TODO
								}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</PageLayout>
	)
}

function UserName() {
	const context = assertContext(Context)
	return (
		<Suspense
			fallback={
				<div class="h-full w-36 animate-pulse rounded-md bg-slate-200"></div>
			}
		>
			<span class="flex font-inter text-xl font-semibold text-slate-1000">
				{context.user()?.name}
			</span>
		</Suspense>
	)
}

function ProfileAvatar() {
	const context = assertContext(Context)

	return (
		<div class="z-10 col-span-3 -mt-[calc(40%+var(--avatar-border))] flex justify-center [--avatar-border:2px] md:[--avatar-border:3px] lg:[--avatar-border:4px]">
			{/* The height must be fit to ensure that the avatar is round */}
			<div class="flex aspect-square h-fit w-4/5 rounded-full bg-white">
				<Avatar
					class="m-auto size-[calc(100%-var(--avatar-border)*2)]"
					user={context.user}
				/>
			</div>
		</div>
	)
}

type ProfileButtonProps = ComponentProps<typeof Button>

function ProfileButton(props: ProfileButtonProps) {
	const CLASS = "ml-auto w-25 rounded-full font-inter"

	const context = assertContext(Context)

	const buttonProps = mergeProps(props, {
		get onMouseOver() {
			return context.userType === UserType.Following ?
					(
						e: MouseEvent & {
							currentTarget: HTMLButtonElement
							target: DOMElement
						},
						// eslint-disable-next-line solid/reactivity
					) => {
						e.target.innerHTML = "Unfollow"
						callHandlerUnion(e, props.onMouseOver)
					}
				:	props.onMouseOver
		},
		get onMouseOut() {
			return context.userType === UserType.Following ?
					(
						e: MouseEvent & {
							currentTarget: HTMLButtonElement
							target: DOMElement
						},
						// eslint-disable-next-line solid/reactivity
					) => {
						e.target.innerHTML = "Following"
						callHandlerUnion(e, props.onMouseEnter)
					}
				:	props.onMouseOver
		},
	} satisfies ComponentProps<"button">)

	return (
		<Suspense
			fallback={
				<div
					class={twMerge(
						CLASS,
						"h-full w-25 animate-pulse rounded-full bg-slate-200",
					)}
				>
					{/* TODO: Skeleton */}
				</div>
			}
		>
			{
				// This is to trigger suspense
				void context.user()
			}
			<Switch>
				<Match when={context.userType === UserType.Current}>
					<Button
						variant="Tertiary"
						color="Slate"
						class={twMerge(CLASS, "text-slate-600")}
						{...buttonProps}
					>
						<Link to="/profile/edit">Edit</Link>
					</Button>
				</Match>
				<Match when={context.userType === UserType.Unfollowed}>
					<Button
						variant="Primary"
						color="Reimu"
						class={CLASS}
						{...buttonProps}
					>
						Follow
					</Button>
				</Match>
				<Match when={context.userType === UserType.Following}>
					<Button
						variant="Secondary"
						color="Reimu"
						class={CLASS}
						{...buttonProps}
					>
						Followed
					</Button>
				</Match>
			</Switch>
		</Suspense>
	)
}

function Bio() {
	const [mdParsing, setMdParsing] = createSignal(true)
	const ctx = assertContext(Context)
	return (
		<div class="col-span-3">
			<div class="mb-2 font-bold text-slate-700">Bio</div>
			<div
				class={`min-h-32 rounded-md bg-slate-100 p-4 ${mdParsing() ? "animate-pulse" : ""}`}
			>
				<Suspense>
					<Markdown
						content={ctx.user()?.bio}
						fallback="这个人什么也没有写哦（"
						onRendered={() => setMdParsing(false)}
					/>
				</Suspense>
			</div>
		</div>
	)
}

function RoleBadge(props: { role: UserRole }) {
	function matchColor(role: UserRole) {
		switch (role) {
			case "Admin":
				// @tw
				return "bg-reimu-100 text-reimu-700"
			case "Moderator":
				// @tw
				return "bg-purple-100/80 text-purple-800/75"
			case "User":
				return ""
		}
	}

	return (
		<Show when={props.role != "User"}>
			<div
				class={twJoin(
					"w-fit rounded-full px-2 py-1 text-center text-xs font-semibold",
					matchColor(props.role),
				)}
			>
				{props.role}
			</div>
		</Show>
	)
}
