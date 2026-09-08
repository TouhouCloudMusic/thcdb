import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import { MathExt } from "@thc/toolkit"
import type { JSX } from "solid-js"
import { createMemo, Match, Show, Switch } from "solid-js"

import * as ImageCropDialog from "~/component/ImageCropDialog"
import { Badge } from "~/component/atomic/Badge"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import {
	USER_PROFILE_BANNER_MAX_HEIGHT,
	USER_PROFILE_BANNER_MAX_WIDTH,
	USER_PROFILE_BANNER_MIN_HEIGHT,
	USER_PROFILE_BANNER_MIN_WIDTH,
} from "~/constant/server"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

import type {
	EditProfileBioStore,
	EditProfileImageStore,
	EditProfileStore,
} from "./store"

export { createEditProfileStore } from "./store"

const styles = stylex.create({
	page: {
		display: "grid",
		minHeight: "100dvh",
		gridTemplateRows: "auto 1fr",
	},
	content: { display: "grid", gap: px[24], padding: px[32] },
	bannerCanvas: { height: px[384] },
	avatarCanvas: { height: px[320] },
	header: {
		position: "relative",
		overflow: "hidden",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: `color-mix(in oklab, ${colors.backgroundPrimary} 70%, transparent)`,
		paddingInline: px[32],
		paddingBlock: px[24],
	},
	headerPattern: {
		backgroundSize: "26px 26px",
		pointerEvents: "none",
		position: "absolute",
		inset: "0rem",
		opacity: 0.65,
		backgroundImage:
			"linear-gradient(to right,rgba(15,23,42,0.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,23,42,0.06) 1px,transparent 1px)",
	},
	headerContent: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
	},
	title: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes["3xl"],
		lineHeight: 1.2,
		fontWeight: 300,
		letterSpacing: "-.025em",
		color: colors.textPrimary,
	},
	role: { marginTop: px[12] },
	profileLink: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
	},
	appearanceCard: {
		overflow: "hidden",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		padding: "0rem",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	appearanceHeading: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		paddingInline: px[20],
		paddingBlock: px[16],
	},
	appearanceTitle: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.22em",
		color: palette.slate[600],
	},
	uploadBanner: { paddingInline: px[12] },
	appearanceSection: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
	},
	banner: {
		position: "relative",
		height: px[224],
		overflow: "hidden",
		backgroundColor: palette.slate[100],
	},
	bannerFallback: {
		position: "absolute",
		inset: "0rem",
		backgroundImage:
			"radial-gradient(circle at 20% 20%,rgba(248,250,252,0.95),rgba(226,232,240,1))",
	},
	bannerImage: {
		position: "absolute",
		inset: "0rem",
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	bannerShade: {
		pointerEvents: "none",
		position: "absolute",
		inset: "0rem",
		backgroundImage:
			"linear-gradient(to bottom,transparent 0%,rgba(15,23,42,0.40) 100%)",
	},
	avatarSection: {
		paddingInline: px[20],
		paddingTop: px[20],
		paddingBottom: px[24],
	},
	avatarControls: {
		display: "grid",
		gap: px[20],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 64rem)": "auto 1fr",
		},
		alignItems: { default: null, "@media (min-width: 64rem)": "flex-end" },
	},
	avatarFrame: {
		marginTop: "-3.5rem",
		position: "relative",
		zIndex: 10,
		width: "fit-content",
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		padding: px[8],
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	avatar: { width: px[96], height: px[96] },
	uploadAvatar: { paddingInline: px[12], width: "fit-content" },
	bioCard: {
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		padding: "0rem",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	bioHeading: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		paddingInline: px[20],
		paddingBlock: px[16],
	},
	bioTitle: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.22em",
		color: palette.slate[600],
	},
	bioCounters: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
	},
	characterCount: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	remainingCount: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[400],
	},
	bioContent: { padding: px[20] },
	bioField: { gap: px[8] },
	bioInput: { minHeight: px[192] },
	bioError: {
		marginTop: px[12],
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.reimu[200],
		paddingInline: px[12],
		paddingBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[800],
	},
	bioActions: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: px[8],
		width: "fit-content",
		height: "fit-content",
		marginLeft: "auto",
		marginTop: px[8],
	},
	cancel: { paddingInline: px[12] },
	save: { paddingInline: px[16] },
})

export type EditProfileViewProps = {
	user: UserProfile
	store: EditProfileStore
}

const formatDateTime = (value: string) => {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date)
}

const computeAvatarOutputSize = (
	rawWidth: number,
	rawHeight: number,
): { width: number; height: number } | undefined => {
	const rawSize = Math.min(rawWidth, rawHeight)
	const minSize = 128
	const next = Math.round(Math.max(rawSize, minSize))
	if (!Number.isFinite(next) || next <= 0) return
	return { width: next, height: next }
}

const computeBannerOutputSize = (
	rawWidth: number,
): { width: number; height: number } | undefined => {
	const ratio = 3
	const width = Math.round(
		MathExt.clamp(
			USER_PROFILE_BANNER_MIN_WIDTH,
			USER_PROFILE_BANNER_MAX_WIDTH,
			rawWidth,
		),
	)
	const height = MathExt.clamp(
		USER_PROFILE_BANNER_MIN_HEIGHT,
		USER_PROFILE_BANNER_MAX_HEIGHT,
		Math.round(width / ratio),
	)
	const normalizedHeight = Math.round(height)
	if (!Number.isFinite(normalizedHeight) || normalizedHeight <= 0) return

	const normalizedWidth = normalizedHeight * ratio
	if (
		normalizedWidth < USER_PROFILE_BANNER_MIN_WIDTH
		|| normalizedWidth > USER_PROFILE_BANNER_MAX_WIDTH
	) {
		return
	}

	return { width: normalizedWidth, height: normalizedHeight }
}

export function EditProfileView(props: EditProfileViewProps) {
	const { t } = useLingui()
	return (
		<PageLayout styles={styles.page}>
			<EditProfileHeader isBioDirty={props.store.bio.isDirty} />

			<div {...stylex.attrs(styles.content)}>
				<AppearanceCard
					user={props.user}
					avatar={props.store.avatar}
					banner={props.store.banner}
				/>

				<BioEditorCard bio={props.store.bio} />
			</div>

			<ImageCropDialog.Root
				open={props.store.avatar.isOpen}
				syncOpen={props.store.avatar.setIsOpen}
				ratio={1}
				computeOutputSize={computeAvatarOutputSize}
				busy={props.store.avatar.isUploading}
				error={props.store.avatar.error}
				onSave={props.store.avatar.onUpload}
				title={t`Update avatar`}
			>
				<ImageCropDialog.Canvas styles={styles.bannerCanvas} />
			</ImageCropDialog.Root>

			<ImageCropDialog.Root
				open={props.store.banner.isOpen}
				syncOpen={props.store.banner.setIsOpen}
				ratio={3}
				computeOutputSize={(rawWidth) => computeBannerOutputSize(rawWidth)}
				busy={props.store.banner.isUploading}
				error={props.store.banner.error}
				onSave={props.store.banner.onUpload}
				title={t`Update banner`}
			>
				<ImageCropDialog.Canvas styles={styles.avatarCanvas} />
			</ImageCropDialog.Root>
		</PageLayout>
	)
}

function EditProfileHeader(props: { isBioDirty: boolean }) {
	return (
		<header {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.headerPattern)}></div>
			<div {...stylex.attrs(styles.headerContent)}>
				<h1 {...stylex.attrs(styles.title)}>Edit profile</h1>
				<Show when={props.isBioDirty}>
					<Badge
						color="Marisa"
						styles={styles.role}
					>
						Unsaved
					</Badge>
				</Show>

				<Link
					to="/profile"
					class={stylex.attrs(link.base, link.text, styles.profileLink).class}
				>
					Back to profile
				</Link>
			</div>
		</header>
	)
}

function AppearanceCard(props: {
	user: UserProfile
	avatar: EditProfileImageStore
	banner: EditProfileImageStore
}) {
	const { t } = useLingui()
	const bannerUrl = createMemo(() => imgUrl(props.user.banner_url))
	const handleEditBanner = () => {
		if (props.banner.isUploading) return
		props.banner.setIsOpen(true)
	}
	const handleEditAvatar = () => {
		if (props.avatar.isUploading) return
		props.avatar.setIsOpen(true)
	}

	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.appearanceCard)}>
			<div {...stylex.attrs(styles.appearanceHeading)}>
				<div {...stylex.attrs(styles.appearanceTitle)}>APPEARANCE</div>
				<Button
					disabled={props.banner.isUploading}
					onClick={handleEditBanner}
					appearance="outline"
					tone="gray"
					size="sm"
					styles={styles.uploadBanner}
				>
					<Switch>
						<Match when={props.banner.isUploading}>{t`Uploading…`}</Match>
						<Match when={!props.banner.isUploading}>{t`Update banner`}</Match>
					</Switch>
				</Button>
			</div>

			<section {...stylex.attrs(styles.appearanceSection)}>
				<div {...stylex.attrs(styles.banner)}>
					<Show
						when={bannerUrl()}
						fallback={<div {...stylex.attrs(styles.bannerFallback)}></div>}
					>
						{(src) => (
							<img
								src={src()}
								alt={t`Profile banner`}
								{...stylex.attrs(styles.bannerImage)}
							/>
						)}
					</Show>
					<div {...stylex.attrs(styles.bannerShade)}></div>
				</div>

				<div {...stylex.attrs(styles.avatarSection)}>
					<div {...stylex.attrs(styles.avatarControls)}>
						<div {...stylex.attrs(styles.avatarFrame)}>
							<Avatar
								user={props.user}
								styles={styles.avatar}
							/>
						</div>

						<Button
							disabled={props.avatar.isUploading}
							onClick={handleEditAvatar}
							appearance="outline"
							tone="gray"
							size="sm"
							styles={styles.uploadAvatar}
						>
							<Switch>
								<Match when={props.avatar.isUploading}>{t`Uploading…`}</Match>
								<Match when={!props.avatar.isUploading}>
									{t`Update avatar`}
								</Match>
							</Switch>
						</Button>
					</div>
				</div>
			</section>
		</div>
	)
}

function BioEditorCard(props: { bio: EditProfileBioStore }) {
	const { t } = useLingui()
	const count = createMemo(() => props.bio.value.length)
	const savedAt = createMemo(() => {
		const value = props.bio.savedAt
		if (!value) return
		return formatDateTime(value)
	})

	const isDisabled = () => !props.bio.isDirty || props.bio.isSaving

	const handleInput: JSX.EventHandlerUnion<HTMLTextAreaElement, InputEvent> = (
		evt,
	) => {
		props.bio.onInput(evt.currentTarget.value)
	}

	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.bioCard)}>
			<div {...stylex.attrs(styles.bioHeading)}>
				<div {...stylex.attrs(styles.bioTitle)}>BIO</div>

				<div {...stylex.attrs(styles.bioCounters)}>
					<div {...stylex.attrs(styles.characterCount)}>{count()} chars</div>
					<Show when={savedAt()}>
						{(label) => (
							<div {...stylex.attrs(styles.remainingCount)}>
								saved {label()}
							</div>
						)}
					</Show>
				</div>
			</div>

			<div {...stylex.attrs(styles.bioContent)}>
				<InputField.Root styles={styles.bioField}>
					<InputField.Textarea
						value={props.bio.value}
						onInput={handleInput}
						placeholder={t`Write something about you.`}
						styles={styles.bioInput}
					/>
				</InputField.Root>

				<Show when={props.bio.error}>
					{(error) => <div {...stylex.attrs(styles.bioError)}>{error()}</div>}
				</Show>

				<div {...stylex.attrs(styles.bioActions)}>
					<Button
						disabled={isDisabled()}
						onClick={() => {
							if (isDisabled()) return
							props.bio.onReset()
						}}
						appearance="outline"
						tone="gray"
						size="sm"
						styles={styles.cancel}
					>
						Discard
					</Button>
					<Button
						disabled={isDisabled()}
						onClick={() => {
							if (isDisabled()) return
							void props.bio.onSave()
						}}
						appearance="solid"
						tone="reimu"
						size="sm"
						styles={styles.save}
					>
						<Switch>
							<Match when={props.bio.isSaving}>{t`Saving…`}</Match>
							<Match when={!props.bio.isSaving}>{t`Save bio`}</Match>
						</Switch>
					</Button>
				</div>
			</div>
		</div>
	)
}
