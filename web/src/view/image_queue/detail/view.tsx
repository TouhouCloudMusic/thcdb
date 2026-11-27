import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { BellAlertIcon, BellIcon } from "@thc/icons/heroicons/24/outline"
import { ChevronRightIcon } from "@thc/icons/radix"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import type { ComponentProps } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { Image } from "~/component/image"
import { IMAGE_QUEUE_STATUS_LABELS } from "~/component/image_queue/statusLabels"
import type { ImageQueueDetail, ImageQueueStatus } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { imgUrl } from "~/utils/adapter/static_file"
import { formatTimestamp } from "~/utils/dateTime"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"

import {
	ImageQueueSubmissionInfo,
	ImageQueueUserLink,
	submissionLayout,
} from "../submission"
import type { ImageQueueDetailViewProps, ImageQueueSubscription } from "./model"

const headerStyles = stylex.create({
	detail: {
		containerType: "inline-size",
		display: "grid",
		width: "100%",
		minWidth: 0,
		gap: px[16],
	},
	route: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: px[8],
	},
	header: {
		display: "grid",
		gap: px[4],
		borderBottomStyle: "solid",
		borderBottomWidth: "1px",
		borderColor: palette.slate[200],
		paddingBottom: px[16],
	},
	subject: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
	},
	status: {
		flexShrink: 0,
		height: px[24],
		paddingBlock: 0,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	title: { minWidth: 0, overflowWrap: "anywhere" },
	metadata: {
		display: "flex",
		flexDirection: {
			default: "column",
			"@container (min-width: 44rem)": "row",
		},
		justifyContent: "space-between",
		gap: px[4],
	},
	byline: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "space-between",
		columnGap: px[12],
		minWidth: 0,
		overflowWrap: "anywhere",
	},
	secondaryText: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	date: { fontVariantNumeric: "tabular-nums" },
})

const STATUS_TONE = {
	Pending: "Marisa",
	Approved: "Green",
	Rejected: "Reimu",
	Cancelled: "Slate",
	Reverted: "Blue",
} satisfies Record<ImageQueueStatus, ComponentProps<typeof Badge>["color"]>

export function ImageQueueDetailView(props: ImageQueueDetailViewProps) {
	const { t } = useLingui()
	const target = () => props.detail.target
	const addsImage = () =>
		props.detail.status === "Pending" && target().current_image_url == null

	return (
		<div {...stylex.attrs(headerStyles.detail)}>
			<header {...stylex.attrs(headerStyles.header)}>
				<div {...stylex.attrs(headerStyles.route)}>
					<ImageQueueBreadcrumb />
					<ImageQueueNavigation
						previousId={props.detail.previous_id}
						nextId={props.detail.next_id}
					/>
				</div>
				<div {...stylex.attrs(headerStyles.subject)}>
					<Badge
						color={STATUS_TONE[props.detail.status]}
						styles={headerStyles.status}
					>
						<output>{t(IMAGE_QUEUE_STATUS_LABELS[props.detail.status])}</output>
					</Badge>
					<h1 {...stylex.attrs(typography.heading.md, headerStyles.title)}>
						<Link
							class={stylex.attrs(link.base, link.withUnderline).class}
							to={target().kind === "artist" ? "/artist/$id" : "/release/$id"}
							params={{ id: target().id.toString() }}
						>
							{target().name}
						</Link>
					</h1>
				</div>
				<div
					{...stylex.attrs(headerStyles.metadata, headerStyles.secondaryText)}
				>
					<span>
						<Switch>
							<Match when={target().kind === "artist"}>
								{addsImage()
									? t`Add artist profile image`
									: t`Artist profile image update`}
							</Match>
							<Match when={target().kind === "release"}>
								{addsImage() ? t`Add release cover` : t`Release cover update`}
							</Match>
						</Switch>
					</span>
					<div {...stylex.attrs(headerStyles.byline)}>
						<ImageQueueUserLink name={props.detail.created_by.name} />
						<time
							dateTime={props.detail.created_at}
							{...stylex.attrs(headerStyles.date)}
						>
							{formatTimestamp(props.detail.created_at)}
						</time>
					</div>
				</div>
			</header>
			<ImageQueueComparison detail={props.detail} />
			<div {...stylex.attrs(submissionLayout.sections)}>
				<ImageQueueSubmissionInfo
					detail={props.detail}
					review={props.review}
				/>
				<ImageQueueDiscussion
					comments={props.comments}
					subscription={props.subscription}
				/>
			</div>
		</div>
	)
}

const navigationStyles = stylex.create({
	breadcrumb: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
	},
	navigation: {
		display: "grid",
		gridTemplateColumns: "auto auto",
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
})

export function ImageQueueBreadcrumb() {
	const { t } = useLingui()
	return (
		<nav
			aria-label={t`Breadcrumb`}
			{...stylex.attrs(navigationStyles.breadcrumb)}
		>
			<Link
				to="/moderation"
				class={stylex.attrs(link.base, link.withUnderline).class}
			>
				{t`Moderation`}
			</Link>
			<ChevronRightIcon
				width={16}
				height={16}
				aria-hidden="true"
			/>
			<Link
				to="/image-queue"
				class={stylex.attrs(link.base, link.withUnderline).class}
			>
				{t`Image queue`}
			</Link>
		</nav>
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
			{...stylex.attrs(navigationStyles.navigation)}
		>
			<Show
				when={props.previousId}
				fallback={
					<button
						type="button"
						disabled
						{...stylex.attrs(navigationStyles.previousUnavailable)}
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
								navigationStyles.previousLink,
							).class
						}
					>
						<span aria-hidden="true">←</span>
						<span
							{...stylex.attrs(navigationStyles.navigationLabel)}
						>{t`Previous`}</span>
					</Link>
				)}
			</Show>
			<Show
				when={props.nextId}
				fallback={
					<button
						type="button"
						disabled
						{...stylex.attrs(navigationStyles.nextUnavailable)}
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
							stylex.attrs(
								link.base,
								stylex.defaultMarker(),
								navigationStyles.nextLink,
							).class
						}
					>
						<span
							{...stylex.attrs(navigationStyles.navigationLabel)}
						>{t`Next`}</span>
						<span aria-hidden="true">→</span>
					</Link>
				)}
			</Show>
		</nav>
	)
}

const comparisonStyles = stylex.create({
	comparison: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
			"@container (min-width: 44rem)": "repeat(auto-fit, minmax(16rem, 1fr))",
		},
		columnGap: { default: px[10], "@container (min-width: 44rem)": px[16] },
		rowGap: px[8],
	},
	imageSection: {
		display: "grid",
		minWidth: "0rem",
		gridTemplateRows: "subgrid",
		gridRow: "span 2",
	},
	imageHeader: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: px[4],
	},
	imageSize: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
		fontVariantNumeric: "tabular-nums",
	},
	imageViewport: {
		position: "relative",
		display: "grid",
		width: "100%",
		aspectRatio: { default: "1", "@container (min-width: 44rem)": "auto" },
		height: {
			default: "auto",
			"@container (min-width: 44rem)": "clamp(17rem, 30vw, 22rem)",
		},
		overflow: "hidden",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
	},
	imageTrigger: {
		position: "absolute",
		inset: 0,
		padding: { default: px[4], "@container (min-width: 44rem)": px[12] },
		cursor: { default: "zoom-in", ":disabled": "default" },
		outlineOffset: -2,
		boxShadow: {
			default: "none",
			":hover": {
				default: null,
				"@media (hover: hover)": `inset 0 0 0 1px ${palette.slate[300]}`,
			},
			":disabled": "none",
		},
	},
	image: {
		width: "100%",
		height: "100%",
		objectFit: "contain",
	},
})

type ImageDimensions = { width: number; height: number }

function ImageSize(props: { dimensions: ImageDimensions }) {
	return (
		<span {...stylex.attrs(comparisonStyles.imageSize)}>
			{props.dimensions.width} × {props.dimensions.height} px
		</span>
	)
}

function ComparisonImage(props: { title: string; src?: string }) {
	const { t } = useLingui()
	const [measurement, setMeasurement] = createSignal<{
		src: string
		dimensions: ImageDimensions
	}>()
	const dimensions = () => {
		const image = measurement()
		if (image && image.src === props.src) return image.dimensions
	}

	return (
		<figure {...stylex.attrs(comparisonStyles.imageSection)}>
			<figcaption {...stylex.attrs(comparisonStyles.imageHeader)}>
				<span {...stylex.attrs(typography.heading.xs)}>{props.title}</span>
				<Show when={dimensions()}>
					{(size) => <ImageSize dimensions={size()} />}
				</Show>
			</figcaption>
			<div {...stylex.attrs(comparisonStyles.imageViewport)}>
				<Show
					when={props.src}
					keyed
					fallback={<Image.Fallback state={Image.State.Missing} />}
				>
					{(src) => (
						<Image.Root url={src}>
							<Image.Fallback />
							<Image.Preview alt={props.title}>
								<Dialog.Trigger
									type="button"
									aria-label={t`Enlarge image: ${props.title}`}
									disabled={!dimensions()}
									{...stylex.attrs(comparisonStyles.imageTrigger)}
								>
									<Image.Img
										alt={props.title}
										styles={comparisonStyles.image}
										onLoad={(event) => {
											const { naturalWidth, naturalHeight } =
												event.currentTarget
											setMeasurement({
												src,
												dimensions: {
													width: naturalWidth,
													height: naturalHeight,
												},
											})
										}}
										onError={() => setMeasurement(undefined)}
									/>
								</Dialog.Trigger>
							</Image.Preview>
						</Image.Root>
					)}
				</Show>
			</div>
		</figure>
	)
}

function ImageQueueComparison(props: { detail: ImageQueueDetail }) {
	const { t } = useLingui()
	const submissionSrc = createMemo(() => imgUrl(props.detail.image?.url))
	const currentSrc = () => {
		const src = imgUrl(props.detail.target.current_image_url)
		if (props.detail.status !== "Approved" || src !== submissionSrc())
			return src
	}

	return (
		<div {...stylex.attrs(comparisonStyles.comparison)}>
			<Show when={currentSrc()}>
				{(src) => (
					<ComparisonImage
						title={t`Current`}
						src={src()}
					/>
				)}
			</Show>
			<ComparisonImage
				title={
					props.detail.status === "Pending"
						? t`Proposed`
						: t(IMAGE_QUEUE_STATUS_LABELS[props.detail.status])
				}
				src={submissionSrc()}
			/>
		</div>
	)
}

const discussionStyles = stylex.create({
	comments: { display: "grid", gap: px[12] },
	threadHeading: { display: "flex", alignItems: "center", gap: px[8] },
	count: {
		marginInlineStart: px[4],
		fontWeight: 400,
		letterSpacing: "normal",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	follow: { borderRadius: radius.full, padding: px[4], flexShrink: 0 },
})

function ImageQueueDiscussion(props: {
	comments: EntityCommentsModel
	subscription: ImageQueueSubscription
}) {
	const { t } = useLingui()
	return (
		<section
			aria-label={t`Comments`}
			{...stylex.attrs(discussionStyles.comments, submissionLayout.discussion)}
		>
			<div {...stylex.attrs(discussionStyles.threadHeading)}>
				<h2 {...stylex.attrs(typography.heading.xs)}>
					{t`Comments`}
					<Show when={props.comments.activeCommentCount()?.toString()}>
						{(count) => (
							<span {...stylex.attrs(discussionStyles.count)}>{count()}</span>
						)}
					</Show>
				</h2>
				<ImageQueueSubscribeButton {...props.subscription} />
			</div>
			<EntityComments.Root model={props.comments}>
				<EntityComments.Form />
				<EntityComments.List />
			</EntityComments.Root>
		</section>
	)
}

function ImageQueueSubscribeButton(props: ImageQueueSubscription) {
	const { t } = useLingui()
	const label = () =>
		props.isSubscribed ? t`Unfollow submission` : t`Follow submission`

	return (
		<Button
			onClick={props.toggle}
			disabled={props.disabled}
			appearance="ghost"
			tone="gray"
			size="sm"
			title={label()}
			aria-label={label()}
			aria-pressed={props.isSubscribed}
			styles={discussionStyles.follow}
		>
			<Show
				when={props.isSubscribed}
				fallback={
					<BellIcon
						width={16}
						height={16}
						aria-hidden="true"
					/>
				}
			>
				<BellAlertIcon
					width={16}
					height={16}
					aria-hidden="true"
				/>
			</Show>
		</Button>
	)
}
