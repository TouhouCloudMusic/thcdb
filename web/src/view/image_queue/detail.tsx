import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import { ArtistQueryOption, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
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
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { useEntityComments } from "~/view/comment/useEntityComments"

const styles = stylex.create({
	destructiveAction: {
		backgroundColor: {
			default: palette.reimu[700],
			":hover": { default: null, "@media (hover: hover)": palette.reimu[800] },
			":active": palette.reimu[900],
		},
	},
	page: {
		display: "flex",
		flexDirection: "column",
		gap: px[12],
		padding: px[16],
	},
	breadcrumb: { display: "flex", alignItems: "center", gap: px[8] },
	backLink: {
		display: "inline-flex",
		alignItems: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
	},
	eyebrow: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.05em",
		color: colors.textSecondary,
	},
	loadingNotice: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		padding: px[24],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	errorNotice: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		padding: px[24],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[700],
	},
	detail: { containerType: "inline-size", display: "grid", gap: px[20] },
	header: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0,1fr) auto",
			"@container (min-width: 56rem)": "auto minmax(0,1fr) auto",
		},
		columnGap: px[16],
		rowGap: px[12],
		borderBottomStyle: "solid",
		borderBottomWidth: "1px",
		borderColor: palette.slate[200],
		paddingBottom: px[20],
		alignItems: { default: null, "@container (min-width: 56rem)": "center" },
	},
	status: {
		gridColumnStart: "1",
		gridRowStart: "1",
		alignSelf: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	title: {
		gridColumnEnd: {
			default: "span 2",
			"@container (min-width: 56rem)": "span 1",
		},
		gridRowStart: { default: "2", "@container (min-width: 56rem)": "1" },
		fontSize: {
			default: fontSizes.xl,
			"@container (min-width: 56rem)": fontSizes["2xl"],
		},
		lineHeight: {
			default: "calc(1.75 / 1.25)",
			"@container (min-width: 56rem)": "calc(2 / 1.5)",
		},
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
		gridColumnStart: {
			default: "span 2",
			"@container (min-width: 56rem)": "2",
		},
	},
	comparisonLayout: {
		display: "grid",
		gap: px[16],
		gridTemplateColumns: {
			default: null,
			"@container (min-width: 56rem)": "minmax(0,1fr) 16rem",
		},
		alignItems: {
			default: null,
			"@container (min-width: 56rem)": "flex-start",
		},
	},
	comparison: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		overflow: "hidden",
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
	},
	sidebar: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,16rem),1fr))",
		alignItems: "flex-start",
		gap: px[16],
		borderTopStyle: "solid",
		borderTopWidth: { default: "1px", "@container (min-width: 56rem)": "0" },
		borderColor: palette.slate[200],
		paddingTop: { default: px[20], "@container (min-width: 56rem)": "0rem" },
	},
	metadata: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,10rem),1fr))",
		columnGap: px[32],
		rowGap: px[16],
	},
	metadataLink: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	metadataValue: {
		color: colors.textPrimary,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	comments: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		padding: px[16],
	},
	navigation: {
		gridColumnStart: { default: "2", "@container (min-width: 56rem)": "3" },
		gridRowStart: "1",
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	previousUnavailable: {
		display: "inline-flex",
		minHeight: px[32],
		alignItems: "center",
		gap: px[4],
		justifySelf: "flex-start",
		borderRadius: radius.sm,
		paddingInline: px[8],
		color: colors.textTertiary,
	},
	previousLink: {
		display: "inline-flex",
		minHeight: px[32],
		alignItems: "center",
		gap: px[4],
		justifySelf: "flex-start",
		borderRadius: radius.sm,
		paddingInline: px[8],
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
		backgroundColor: {
			default: null,
			":hover": {
				default: null,
				"@media (hover: hover)": colors.backgroundSecondary,
			},
		},
	},
	navigationLabel: {
		textUnderlineOffset: "4px",
		textDecorationLine: {
			default: null,
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: "underline",
			},
		},
	},
	nextUnavailable: {
		display: "inline-flex",
		minHeight: px[32],
		alignItems: "center",
		gap: px[4],
		justifySelf: "flex-end",
		borderRadius: radius.sm,
		paddingInline: px[8],
		color: colors.textTertiary,
	},
	nextLink: {
		display: "inline-flex",
		minHeight: px[32],
		alignItems: "center",
		gap: px[4],
		justifySelf: "flex-end",
		borderRadius: radius.sm,
		paddingInline: px[8],
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
		backgroundColor: {
			default: null,
			":hover": {
				default: null,
				"@media (hover: hover)": colors.backgroundSecondary,
			},
		},
	},
	imageSection: {
		display: "grid",
		minWidth: "0rem",
		gridTemplateRows: "auto 1fr",
	},
	imageHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
		borderBottomStyle: "solid",
		borderBottomWidth: "1px",
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundSecondary,
		paddingInline: px[12],
		paddingBlock: px[8],
	},
	label: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: colors.textSecondary,
	},
	loadingImage: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	imageViewport: {
		position: "relative",
		aspectRatio: "4 / 3",
		maxHeight: px[320],
		overflow: "hidden",
		backgroundColor: colors.backgroundSecondary,
	},
	imagePlaceholder: {
		position: "absolute",
		inset: "0rem",
		display: "grid",
		placeItems: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	image: {
		width: "100%",
		height: "100%",
		objectFit: "contain",
		padding: px[12],
	},
	metadataField: { display: "grid", gap: px[4] },
	actions: { display: "grid", gap: px[8] },
	actionsHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
	},
	workingHint: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
	},
	actionDescription: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	actionButton: { height: px[28], width: "100%" },
	actionError: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.reimu[200],
		paddingInline: px[12],
		paddingBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[800],
	},
	comparisonChild: {
		borderInlineStartWidth: { default: null, ":not(:last-child)": 0 },
		borderInlineEndWidth: { default: null, ":not(:last-child)": "1px" },
		borderInlineStartStyle: { default: null, ":not(:last-child)": "solid" },
		borderInlineEndStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: { default: null, ":not(:last-child)": palette.slate[300] },
	},
})

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

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
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.breadcrumb)}>
				<Link
					{...IMAGE_QUEUE_LIST_LINK}
					class={stylex.attrs(link.base, styles.backLink).class}
				>
					<span aria-hidden="true">←</span>
				</Link>
				<div {...stylex.attrs(styles.eyebrow)}>IMAGE QUEUE</div>
			</div>

			<Switch>
				<Match when={detailQuery.isLoading}>
					<div {...stylex.attrs(styles.loadingNotice)}>Loading…</div>
				</Match>

				<Match when={detailQuery.isError}>
					<div {...stylex.attrs(styles.errorNotice)}>
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
		<div {...stylex.attrs(styles.detail)}>
			<header {...stylex.attrs(styles.header)}>
				<Badge
					color={tone().color}
					styles={styles.status}
				>
					<ImageQueueStatusLabel status={props.detail.status} />
				</Badge>
				<h1 {...stylex.attrs(styles.title)}>
					<Show
						when={getTargetMeta(props.detail)}
						fallback={t`Image queue`}
					>
						{(target) => (
							<>
								Update request for{" "}
								<Link
									class={stylex.attrs(link.base, link.text).class}
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
			<div {...stylex.attrs(styles.comparisonLayout)}>
				<section {...stylex.attrs(styles.comparison)}>
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
				</section>
				<aside {...stylex.attrs(styles.sidebar)}>
					<div {...stylex.attrs(styles.metadata)}>
						<InfoField label={t`Submitted by`}>
							<Link
								to="/profile/$username/image-queue"
								params={{ username: props.detail.created_by.name }}
								class={
									stylex.attrs(link.base, link.text, styles.metadataLink).class
								}
							>
								{props.detail.created_by.name}
							</Link>
						</InfoField>
						<InfoField label={t`Created`}>
							<div {...stylex.attrs(styles.metadataValue)}>
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
											class={
												stylex.attrs(link.base, link.text, styles.metadataLink)
													.class
											}
										>
											{user().name}
										</Link>
									)}
								</Show>
								<Show when={props.detail.handled_at}>
									<div {...stylex.attrs(styles.metadataValue)}>
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
											class={
												stylex.attrs(link.base, link.text, styles.metadataLink)
													.class
											}
										>
											{user().name}
										</Link>
									)}
								</Show>
								<Show when={props.detail.reverted_at}>
									<div {...stylex.attrs(styles.metadataValue)}>
										{formatDateTime(props.detail.reverted_at)}
									</div>
								</Show>
							</InfoField>
						</Show>
					</div>
					<ImageQueueActions
						canModerate={props.canModerate}
						detail={props.detail}
						isModerating={props.isModerating}
						onModerate={props.onModerate}
						errorMessage={props.moderationErrorMessage}
						entryId={props.detail.id}
						isSubscribed={props.detail.is_subscribed}
					/>
				</aside>
			</div>
			<section {...stylex.attrs(styles.comments)}>
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
			{...stylex.attrs(styles.navigation)}
		>
			<Show
				when={props.previousId}
				fallback={
					<button
						type="button"
						disabled
						{...stylex.attrs(styles.previousUnavailable)}
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
						class={
							stylex.attrs(
								link.base,
								stylex.defaultMarker(),
								styles.previousLink,
							).class
						}
					>
						<span aria-hidden="true">←</span>
						<span {...stylex.attrs(styles.navigationLabel)}>{t`Previous`}</span>
					</Link>
				)}
			</Show>
			<Show
				when={props.nextId}
				fallback={
					<button
						type="button"
						disabled
						{...stylex.attrs(styles.nextUnavailable)}
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
						class={
							stylex.attrs(link.base, stylex.defaultMarker(), styles.nextLink)
								.class
						}
					>
						<span {...stylex.attrs(styles.navigationLabel)}>{t`Next`}</span>
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
		<section {...stylex.attrs(styles.imageSection, styles.comparisonChild)}>
			<header {...stylex.attrs(styles.imageHeader)}>
				<h2 {...stylex.attrs(styles.label)}>{props.title}</h2>
				{props.headerRight}
				<Show when={props.loading}>
					<div {...stylex.attrs(styles.loadingImage)}>{t`Loading…`}</div>
				</Show>
			</header>

			<Image.Root>
				<div {...stylex.attrs(styles.imageViewport)}>
					<Image.Fallback>
						{(state) => (
							<div {...stylex.attrs(styles.imagePlaceholder)}>
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
						styles={styles.image}
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
		<section {...stylex.attrs(styles.metadataField)}>
			<h2 {...stylex.attrs(styles.label)}>{props.label}</h2>
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
	tone: "green" | "reimu"
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
					disabled={props.disabled}
					appearance="solid"
					tone={props.tone}
					size="sm"
					styles={[
						styles.actionButton,
						props.tone === "reimu" && styles.destructiveAction,
					]}
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

function ImageQueueActions(props: {
	canModerate: boolean
	detail: ImageQueueDetail
	isModerating: boolean
	onModerate: (action: ImageQueueAction) => void
	errorMessage?: string
	entryId: number
	isSubscribed: boolean
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
		<section {...stylex.attrs(styles.actions)}>
			<div {...stylex.attrs(styles.actionsHeader)}>
				<div {...stylex.attrs(styles.label)}>{t`Actions`}</div>
				<Show when={props.isModerating}>
					<div {...stylex.attrs(styles.workingHint)}>{t`Working…`}</div>
				</Show>
			</div>

			<Switch>
				<Match when={!props.canModerate}>
					<div {...stylex.attrs(styles.actionDescription)}>
						{t`No actions available for this account.`}
					</div>
				</Match>
				<Match when={isPending()}>
					<>
						<ConfirmActionButton
							title={t`Approve image?`}
							description={t({
								message: "This will mark the queued image as approved.",
							})}
							confirmText={t`Approve`}
							tone="green"
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
							tone="reimu"
							disabled={props.isModerating || !isPending()}
							onConfirm={() => props.onModerate("Reject")}
						>
							{t`Reject`}
						</ConfirmActionButton>
					</>
				</Match>
				<Match when={isApproved()}>
					<Button
						disabled={props.isModerating || !isApproved()}
						onClick={() => props.onModerate("Revert")}
						appearance="solid"
						tone="blue"
						size="sm"
						styles={styles.actionButton}
					>
						{t`Revert`}
					</Button>
				</Match>
				<Match when={true}>
					<div
						{...stylex.attrs(styles.actionDescription)}
					>{t`No actions available.`}</div>
				</Match>
			</Switch>

			<Show when={props.errorMessage}>
				<div {...stylex.attrs(styles.actionError)}>{props.errorMessage}</div>
			</Show>

			<ImageQueueSubscribeButton
				entryId={props.entryId}
				isSubscribed={props.isSubscribed}
			/>
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
			onClick={toggle}
			disabled={
				mutation.isPending || userCtx.session.status !== "authenticated"
			}
			appearance="outline"
			tone="gray"
			size="sm"
			styles={styles.actionButton}
		>
			{props.isSubscribed ? t`Unsubscribe` : t`Subscribe`}
		</Button>
	)
}
