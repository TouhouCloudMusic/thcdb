import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { ArtistQueryOption, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import { Image } from "~/component/image"
import { showErrorToast } from "~/component/toast"
import { hasUserPermission } from "~/domain/user/authorization"
import { USER_PERMISSION_NAMES } from "~/domain/user/constants"
import type {
	DataImageQueueDetail,
	ImageQueueAction,
	ImageQueueDetail,
	ImageQueueStatus,
} from "~/hey-api"
import {
	imageQueueDetailOptions,
	imageQueueDetailQueryKey,
	moderateImageQueueMutation,
	pendingImageQueueCountQueryKey,
	pendingImageQueueInfiniteQueryKey,
	profileImageQueueInfiniteQueryKey,
	profileImageQueueWithNameInfiniteQueryKey,
	setImageQueueSubscriptionMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout"
import { useCurrentUser } from "~/state/user"
import { imgUrl } from "~/utils/adapter/static_file"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { useEntityComments } from "~/view/comment/useEntityComments"

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const LABEL_CLASS = "text-xs text-tertiary"

const SURFACE_CARD_CLASS =
	"rounded-sm border border-slate-300 bg-primary shadow-xs"

function statusTone(status: ImageQueueStatus) {
	switch (status) {
		case "Pending": {
			return { color: "Marisa" } as const
		}
		case "Approved": {
			return { color: "Green" } as const
		}
		case "Rejected": {
			return { color: "Reimu" } as const
		}
		case "Cancelled": {
			return { color: "Slate" } as const
		}
		case "Reverted": {
			return { color: "Blue" } as const
		}
		default: {
			return { color: "Slate" } as const
		}
	}
}

function formatDateTime(value: string | null | undefined) {
	if (!value) return "—"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return DATE_TIME.format(date)
}

function imagePath(detail: ImageQueueDetail) {
	const image = detail.image
	if (!image) return
	const dir = image.directory.replaceAll(/\/+$/gu, "")
	if (!dir) return image.filename
	return `${dir}/${image.filename}`
}

function getTargetMeta(detail: ImageQueueDetail) {
	if (detail.artist) {
		return {
			entity: "Artist" as const,
			id: detail.artist.artist_id,
			type: detail.artist.type,
			to: "/artist/$id" as const,
		}
	}

	if (detail.release) {
		return {
			entity: "Release" as const,
			id: detail.release.release_id,
			type: detail.release.type,
			to: "/release/$id" as const,
		}
	}
}

type Props = {
	entryId: number
}

export type ImageQueueDetailViewProps = {
	detail: ImageQueueDetail
	canModerate: boolean
	isModerating: boolean
	moderationErrorMessage?: string
	onModerate: (action: ImageQueueAction) => void
	targetName?: string
	targetImageSrc?: string
	targetImageLoading: boolean
	targetImageError: boolean
	comments: EntityCommentsModel
}

const IMAGE_QUEUE_LIST_LINK = {
	to: "/image-queue",
	search: { status: "pending" },
} as const

export function ImageQueueDetailPage(props: Props) {
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const detailQuery = useQuery(() =>
		imageQueueDetailOptions({ path: { id: props.entryId } }),
	)
	const moderationMutation = useMutation(() => moderateImageQueueMutation())
	const comments = useEntityComments(() => ({
		entityType: "image-queue",
		entityId: props.entryId,
	}))
	const canModerate = createMemo(() =>
		hasUserPermission(
			userCtx.authorization,
			USER_PERMISSION_NAMES.ImageQueueManage,
		),
	)

	const entry = createMemo(() => detailQuery.data?.data)
	const targetPreview = useTargetPreview(() => entry())

	const moderate = (
		currentDetail: ImageQueueDetail,
		action: ImageQueueAction,
	) => {
		const entryId = currentDetail.id

		moderationMutation.mutate(
			{ path: { id: entryId }, query: { action } },
			{
				onSuccess: () => {
					void queryClient.invalidateQueries({
						queryKey: imageQueueDetailQueryKey({
							path: { id: entryId },
						}),
					})
					void queryClient.invalidateQueries({
						queryKey: pendingImageQueueInfiniteQueryKey(),
					})
					void queryClient.invalidateQueries({
						queryKey: pendingImageQueueCountQueryKey(),
					})
					void queryClient.invalidateQueries({
						queryKey: profileImageQueueInfiniteQueryKey(),
					})

					void queryClient.invalidateQueries({
						queryKey: profileImageQueueWithNameInfiniteQueryKey({
							path: { name: currentDetail.created_by.name },
						}),
					})

					if (currentDetail.artist?.artist_id !== undefined) {
						void queryClient.invalidateQueries({
							queryKey: ["artist::profile", currentDetail.artist.artist_id],
						})
					}

					if (currentDetail.release?.release_id !== undefined) {
						void queryClient.invalidateQueries({
							queryKey: ["release::info", currentDetail.release.release_id],
						})
					}
				},
			},
		)
	}

	const moderationErrorMessage = createMemo(() => {
		if (!moderationMutation.isError) return
		const error = moderationMutation.error
		return typeof error === "string" ? error : error.message
	})

	return (
		<PageLayout class="flex flex-col gap-2 p-8">
			<div class="flex flex-wrap items-center gap-2">
				<Link
					{...IMAGE_QUEUE_LIST_LINK}
					underline={false}
					class="inline-flex items-center text-sm text-secondary hover:text-primary"
				>
					<span aria-hidden="true">←</span>
				</Link>
				<div class="text-xs font-medium tracking-wider text-tertiary">
					IMAGE QUEUE
				</div>
			</div>

			<Switch>
				<Match when={detailQuery.isLoading}>
					<div class={`${SURFACE_CARD_CLASS} p-6 text-sm text-secondary`}>
						Loading…
					</div>
				</Match>

				<Match when={detailQuery.isError}>
					<div class={`${SURFACE_CARD_CLASS} p-6 text-sm text-reimu-700`}>
						Failed to load image queue entry.
					</div>
				</Match>

				<Match when={entry()}>
					{(detail) => (
						<ImageQueueDetailView
							detail={detail()}
							canModerate={canModerate()}
							isModerating={moderationMutation.isPending}
							moderationErrorMessage={moderationErrorMessage()}
							onModerate={(action) => moderate(detail(), action)}
							targetName={targetPreview.name()}
							targetImageSrc={targetPreview.targetImageSrc()}
							targetImageLoading={targetPreview.targetImageLoading()}
							targetImageError={targetPreview.targetImageError()}
							comments={comments}
						/>
					)}
				</Match>
			</Switch>
		</PageLayout>
	)
}

export function ImageQueueDetailView(props: ImageQueueDetailViewProps) {
	const { t } = useLingui()
	const queuedImageSrc = () => {
		const queuedPath = imagePath(props.detail)
		return queuedPath ? imgUrl(queuedPath) : undefined
	}
	const tone = () => statusTone(props.detail.status)

	return (
		<div class="grid grid-cols-[minmax(0,1fr)_16rem] gap-4">
			<header class="grid grid-cols-[auto_minmax(0,1fr)_16rem] gap-2 col-span-2 items-baseline">
				<Badge
					color={tone().color}
					class="self-baseline-last text-sm"
				>
					<ImageQueueStatusLabel status={props.detail.status} />
				</Badge>
				<h1 class="text-2xl font-light tracking-tight text-primary">
					<Show
						when={getTargetMeta(props.detail)}
						fallback={t`Image queue`}
					>
						{(target) => (
							<>
								Update request for{" "}
								<Link
									to={target().to}
									params={{ id: target().id.toString() }}
								>
									{props.targetName ?? (
										<>
											<TargetEntityLabel entity={target().entity} /> #
											{target().id}
										</>
									)}
								</Link>
								&apos;s <TargetImageLabel entity={target().entity} />
							</>
						)}
					</Show>
				</h1>
				<ImageQueueNavigation
					previousId={props.detail.previous_id}
					nextId={props.detail.next_id}
				/>
			</header>
			<div class="grid gap-4 md:contents">
				<section class="grid content-start gap-2">
					<div class="grid gap-2 grid-cols-2">
						<ComparisonImage
							title={t`Current`}
							src={props.targetImageSrc}
							alt={t`Current target image`}
							loading={props.targetImageLoading}
							error={props.targetImageError}
						/>
						<ComparisonImage
							title={t`Queued`}
							src={queuedImageSrc()}
							alt={t`Queued upload preview`}
						/>
					</div>
				</section>
				<aside class="grid content-start gap-2">
					<div class="flex flex-col gap-2">
						<ModerationControls
							canModerate={props.canModerate}
							detail={props.detail}
							isModerating={props.isModerating}
							onModerate={props.onModerate}
							errorMessage={props.moderationErrorMessage}
						/>
						<ImageQueueSubscribeButton
							entryId={props.detail.id}
							isSubscribed={props.detail.is_subscribed}
						/>
						<div class="grid gap-y-2">
							<InfoField label={t`Submitted by`}>
								<Link
									to="/profile/$username/image-queue"
									params={{ username: props.detail.created_by.name }}
									class="text-sm"
								>
									{props.detail.created_by.name}
								</Link>
							</InfoField>
							<InfoField label={t`Created`}>
								<div class="text-primary text-sm">
									{formatDateTime(props.detail.created_at)}
								</div>
							</InfoField>
							<Show when={props.detail.handled_by ?? props.detail.handled_at}>
								<InfoField label={t`Handled`}>
									<Show when={props.detail.handled_by}>
										{(user) => (
											<Link
												to="/profile/$username/image-queue"
												params={{ username: user().name }}
												class="text-sm"
											>
												{user().name}
											</Link>
										)}
									</Show>
									<Show when={props.detail.handled_at}>
										<div class="text-primary text-sm">
											{formatDateTime(props.detail.handled_at)}
										</div>
									</Show>
								</InfoField>
							</Show>
							<Show when={props.detail.reverted_by ?? props.detail.reverted_at}>
								<InfoField label={t`Reverted`}>
									<Show when={props.detail.reverted_by}>
										{(user) => (
											<Link
												to="/profile/$username/image-queue"
												params={{ username: user().name }}
												class="text-sm"
											>
												{user().name}
											</Link>
										)}
									</Show>
									<Show when={props.detail.reverted_at}>
										<div class="text-primary text-sm">
											{formatDateTime(props.detail.reverted_at)}
										</div>
									</Show>
								</InfoField>
							</Show>
						</div>
					</div>
				</aside>
			</div>
			<section class={`${SURFACE_CARD_CLASS} col-span-2 p-4`}>
				<EntityComments model={props.comments} />
			</section>
		</div>
	)
}

function ImageQueueNavigation(props: {
	previousId?: number | null
	nextId?: number | null
}) {
	const { t } = useLingui()

	return (
		<nav
			aria-label={t`Image queue navigation`}
			class="grid grid-cols-2 gap-4 text-xs"
		>
			<Show
				when={props.previousId}
				fallback={
					<button
						type="button"
						disabled
						class="inline-flex items-center gap-1 justify-self-start text-tertiary"
					>
						<span aria-hidden="true">←</span>
						{t`Previous`}
					</button>
				}
			>
				{(id) => (
					<Link
						to="/image-queue/$id"
						params={{ id: id().toString() }}
						rel="prev"
						aria-label={t`Previous image queue entry`}
						underline={false}
						class="inline-flex items-center gap-1 justify-self-start group text-secondary hover:text-primary"
					>
						<span aria-hidden="true">←</span>
						<span class="underline-offset-4 group-hover:underline">
							{t`Previous`}
						</span>
					</Link>
				)}
			</Show>
			<Show
				when={props.nextId}
				fallback={
					<button
						type="button"
						disabled
						class="inline-flex items-center gap-1 justify-self-end text-tertiary"
					>
						{t`Next`}
						<span aria-hidden="true">→</span>
					</button>
				}
			>
				{(id) => (
					<Link
						to="/image-queue/$id"
						params={{ id: id().toString() }}
						rel="next"
						aria-label={t`Next image queue entry`}
						underline={false}
						class="inline-flex items-center gap-1 justify-self-end group text-secondary hover:text-primary"
					>
						<span class="underline-offset-4 group-hover:underline">
							{t`Next`}
						</span>
						<span aria-hidden="true">→</span>
					</Link>
				)}
			</Show>
		</nav>
	)
}

function useTargetPreview(detail: () => ImageQueueDetail | undefined) {
	const artistId = createMemo(() => detail()?.artist?.artist_id)
	const releaseId = createMemo(() => detail()?.release?.release_id)

	const artistQuery = useQuery(() => {
		const id = artistId() ?? 0
		return {
			...ArtistQueryOption.findById(id),
			enabled: artistId() !== undefined,
		}
	})

	const releaseQuery = useQuery(() => {
		const id = releaseId() ?? 0
		return {
			...ReleaseQueryOption.findById(id),
			enabled: releaseId() !== undefined,
		}
	})

	const name = createMemo(() => {
		if (artistId() !== undefined) {
			const artist = artistQuery.data
				? O.getOrUndefined(artistQuery.data)
				: undefined
			return artist?.name
		}

		if (releaseId() !== undefined) {
			const release = releaseQuery.data
				? O.getOrUndefined(releaseQuery.data)
				: undefined
			return release?.title
		}
	})

	const targetImageSrc = createMemo(() => {
		if (artistId() !== undefined) {
			const artist = artistQuery.data
				? O.getOrUndefined(artistQuery.data)
				: undefined
			return imgUrl(artist?.profile_image_url)
		}

		if (releaseId() !== undefined) {
			const release = releaseQuery.data
				? O.getOrUndefined(releaseQuery.data)
				: undefined
			return imgUrl(release?.cover_art_url)
		}
	})

	const targetImageLoading = createMemo(() => {
		if (artistId() !== undefined) return artistQuery.isLoading
		if (releaseId() !== undefined) return releaseQuery.isLoading
		return false
	})

	const targetImageError = createMemo(() => {
		if (artistId() !== undefined) return artistQuery.isError
		if (releaseId() !== undefined) return releaseQuery.isError
		return false
	})

	return { name, targetImageSrc, targetImageLoading, targetImageError }
}

function ComparisonImage(props: {
	title: string
	headerRight?: JSX.Element
	src: string | undefined
	alt: string
	loading?: boolean
	error?: boolean
}) {
	const { t } = useLingui()
	return (
		<section class="grid gap-2">
			<header class="flex items-center justify-between gap-3">
				<h2 class={LABEL_CLASS}>{props.title}</h2>
				{props.headerRight}
				<Show when={props.loading}>
					<div class="text-xs text-tertiary">{t`Loading…`}</div>
				</Show>
			</header>

			<Image.Root>
				<div class="relative aspect-4/3 overflow-hidden rounded-sm border border-slate-200 bg-secondary">
					<Image.Fallback>
						{(state) => (
							<div class="absolute inset-0 grid place-items-center text-sm text-tertiary">
								<Switch>
									<Match when={props.error ?? state === Image.State.Error}>
										Failed to load
									</Match>
									<Match when={props.loading}>{t`Loading…`}</Match>
									<Match when={!props.src}>{t`No image`}</Match>
									<Match when={true}>{t`Loading…`}</Match>
								</Switch>
							</div>
						)}
					</Image.Fallback>
					<Image.Img
						src={props.src}
						alt={props.alt}
						class="size-full object-contain"
					/>
				</div>
			</Image.Root>
		</section>
	)
}

type InfoFieldProps = {
	label: string
	children: JSX.Element
}

function InfoField(props: InfoFieldProps) {
	return (
		<section class="grid gap-1">
			<h2 class={LABEL_CLASS}>{props.label}</h2>
			{props.children}
		</section>
	)
}

function ImageQueueStatusLabel(props: { status: ImageQueueStatus }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.status) {
			case "Pending": {
				return t`Pending`
			}
			case "Approved": {
				return t`Approved`
			}
			case "Rejected": {
				return t`Rejected`
			}
			case "Cancelled": {
				return t`Cancelled`
			}
			case "Reverted": {
				return t`Reverted`
			}
			default: {
				return t`Unknown`
			}
		}
	}

	return <>{label()}</>
}

function TargetEntityLabel(props: { entity: "Artist" | "Release" }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.entity) {
			case "Artist": {
				return t`Artist`
			}
			case "Release": {
				return t`Release`
			}
		}
	}

	return <>{label()}</>
}

function TargetImageLabel(props: { entity: "Artist" | "Release" }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.entity) {
			case "Artist": {
				return t`profile image`
			}
			case "Release": {
				return t`cover art`
			}
		}
	}

	return <>{label()}</>
}

type ConfirmActionButtonProps = {
	title: string
	description: string
	confirmText: string
	color: "Green" | "Reimu"
	disabled: boolean
	onConfirm: () => void
	children: string
}

function ConfirmActionButton(props: ConfirmActionButtonProps) {
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)

	const confirm = () => {
		setOpen(false)
		props.onConfirm()
	}

	return (
		<AlertDialog
			open={open()}
			onOpenChange={setOpen}
			triggerAs={(triggerProps) => (
				<Button
					{...triggerProps}
					variant="Primary"
					color={props.color}
					size="Sm"
					disabled={props.disabled}
					class="w-full"
				>
					{props.children}
				</Button>
			)}
			title={props.title}
			description={props.description}
			confirmText={props.confirmText}
			cancelText={t`Cancel`}
			onCancel={() => setOpen(false)}
			onConfirm={confirm}
		/>
	)
}

function ModerationControls(props: {
	canModerate: boolean
	detail: ImageQueueDetail
	isModerating: boolean
	onModerate: (action: ImageQueueAction) => void
	errorMessage?: string
}) {
	const { t } = useLingui()
	const status = () => props.detail.status
	const isPending = () =>
		status()
		// @wc-ignore
		=== "Pending"
	const isApproved = () =>
		status()
		// @wc-ignore
		=== "Approved"

	return (
		<section class="grid gap-2">
			<div class="flex items-center justify-between gap-3">
				<div class={LABEL_CLASS}>{t`Actions`}</div>
				<Show when={props.isModerating}>
					<div class="text-xs text-secondary">{t`Working…`}</div>
				</Show>
			</div>

			<Switch>
				<Match when={!props.canModerate}>
					<div class="text-sm text-secondary">
						{t`No actions available for this account.`}
					</div>
				</Match>
				<Match when={isPending()}>
					<div class="grid grid-cols-2 gap-2">
						<ConfirmActionButton
							title={t`Approve image?`}
							description={t({
								message: "This will mark the queued image as approved.",
							})}
							confirmText={t`Approve`}
							color="Green"
							disabled={props.isModerating || !isPending()}
							onConfirm={() => props.onModerate("Approve")}
						>
							{t`Approve`}
						</ConfirmActionButton>
						<ConfirmActionButton
							title={t`Reject image?`}
							description={t({
								message: "This will mark the queued image as rejected.",
							})}
							confirmText={t`Reject`}
							color="Reimu"
							disabled={props.isModerating || !isPending()}
							onConfirm={() => props.onModerate("Reject")}
						>
							{t`Reject`}
						</ConfirmActionButton>
					</div>
				</Match>
				<Match when={isApproved()}>
					<Button
						variant="Primary"
						color="Blue"
						size="Sm"
						disabled={props.isModerating || !isApproved()}
						class="w-full"
						onClick={() => props.onModerate("Revert")}
					>
						{t`Revert`}
					</Button>
				</Match>
				<Match when={true}>
					<div class="text-sm text-secondary">{t`No actions available.`}</div>
				</Match>
			</Switch>

			<Show when={props.errorMessage}>
				<div class="rounded-sm border border-reimu-200 bg-reimu-50 px-3 py-2 text-sm text-reimu-800">
					{props.errorMessage}
				</div>
			</Show>
		</section>
	)
}

function ImageQueueSubscribeButton(props: {
	entryId: number
	isSubscribed: boolean
}) {
	const { t } = useLingui()
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const mutation = useMutation(setImageQueueSubscriptionMutation)

	const toggle = () => {
		const entryId = props.entryId
		void mutation
			.mutateAsync({
				path: { id: entryId },
				query: { subscribed: !props.isSubscribed },
			})
			.then(
				userCtx.bindCurrentSession((response) => {
					queryClient.setQueryData<DataImageQueueDetail>(
						imageQueueDetailQueryKey({ path: { id: entryId } }),
						(detail) =>
							detail
								? {
										...detail,
										data: {
											...detail.data,
											is_subscribed: response.data.subscribed,
										},
									}
								: detail,
					)
				}),
				userCtx.bindCurrentSession(() => {
					showErrorToast({ title: t`Failed to update subscription` })
				}),
			)
	}

	return (
		<Button
			variant="Secondary"
			color="Reimu"
			size="Sm"
			class="w-full"
			onClick={toggle}
			disabled={
				mutation.isPending || userCtx.session.status !== "authenticated"
			}
		>
			{props.isSubscribed ? t`Unsubscribe` : t`Subscribe`}
		</Button>
	)
}
