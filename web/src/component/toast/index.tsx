import * as Toast from "@kobalte/core/toast"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { IconProps } from "@thc/icons"
import {
	CheckIcon,
	Cross1Icon,
	InfoCircledIcon,
	ExclamationTriangleIcon,
} from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { Show, splitProps, createMemo } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, fontSizes, px } from "~/style/tokens.stylex"

import { animationNames } from "../../style/animations.stylex"

type ToastTone = "notification" | "success" | "error"

type ShowToastOptions = {
	title: string
	description?: string
	tone: ToastTone
}

type AppToastProps = Toast.ToastComponentProps & ShowToastOptions

type ToastToneStyle = {
	toast: StyleXStyles
	accentLine: StyleXStyles
	iconWrapper: StyleXStyles
	close: StyleXStyles
	progressFill: StyleXStyles
	Icon: (props: IconProps) => JSX.Element
}

const styles = stylex.create({
	notificationToast: {
		borderColor: palette.slate[300],
	},
	notificationAccent: { backgroundColor: palette.slate[600] },
	notificationIcon: {
		backgroundColor: palette.slate[100],
		color: palette.slate[700],
		boxShadow: `0 0 0 1px ${palette.slate[200]}`,
	},
	notificationClose: {
		outlineColor: { default: null, ":focus-visible": palette.slate[600] },
	},
	successToast: {
		borderColor: palette.green[300],
	},
	successAccent: { backgroundColor: palette.green[600] },
	successIcon: {
		backgroundColor: palette.green[100],
		color: palette.green[700],
		boxShadow: `0 0 0 1px ${palette.green[200]}`,
	},
	successClose: {
		outlineColor: { default: null, ":focus-visible": palette.green[600] },
	},
	errorToast: {
		borderColor: palette.reimu[300],
	},
	errorAccent: { backgroundColor: palette.reimu[600] },
	errorIcon: {
		backgroundColor: palette.reimu[100],
		color: palette.reimu[700],
		boxShadow: `0 0 0 1px ${palette.reimu[200]}`,
	},
	errorClose: {
		outlineColor: { default: null, ":focus-visible": palette.reimu[600] },
	},
	region: {
		position: "fixed",
		right: px[16],
		top: px[16],
		zIndex: 50,
		width: "min(380px,calc(100vw - 2rem))",
	},
	list: { display: "flex", flexDirection: "column", gap: px[8] },
	toast: {
		position: "relative",
		display: "grid",
		gridTemplateColumns: "auto 1fr auto",
		alignItems: "start",
		gap: px[12],
		backgroundColor: "rgb(255 255 255 / 0.95)",
		paddingBlock: px[12],
		paddingLeft: px[16],
		paddingRight: px[12],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		boxShadow: "var(--shadow-4)",
		outlineStyle: "none",
		backdropFilter: "blur(8px)",
		transitionProperty: {
			default:
				"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		animationDuration: "200ms",
		animationTimingFunction: "ease",
		animationName: {
			default: null,
			":is([data-closed])": animationNames.fadeOut,
			":is([data-opened])": animationNames.fadeIn,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		borderWidth: "1px",
		borderStyle: "solid",
	},
	accent: {
		position: "absolute",
		bottom: "-1px",
		left: "-1px",
		top: "-1px",
		width: px[4],
		zIndex: 10,
	},
	body: { minWidth: 0 },
	title: {
		fontSize: fontSizes.sm,
		fontWeight: 500,
		lineHeight: "1.25rem",
		color: palette.slate[900],
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	description: {
		marginTop: px[2],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		color: palette.slate[600],
	},
	close: {
		marginRight: "-0.25rem",
		marginTop: "-0.25rem",
		display: "grid",
		width: px[28],
		height: px[28],
		flexShrink: 0,
		placeItems: "center",
		color: {
			default: palette.slate[500],
			":hover": { default: null, "@media (hover: hover)": palette.slate[900] },
		},
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
		},
		transitionProperty: {
			default:
				"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		outlineStyle: { default: null, ":focus-visible": "solid" },
		outlineWidth: { default: null, ":focus-visible": "2px" },
		outlineOffset: { default: null, ":focus-visible": "2px" },
	},
	icon: { width: px[16], height: px[16] },
	track: {
		position: "absolute",
		bottom: "-1px",
		left: "-1px",
		right: "-1px",
		height: "1.5px",
		zIndex: 10,
		backgroundColor: "transparent",
	},
	fill: { height: "100%", width: "var(--kb-toast-progress-fill-width)" },
	iconWrapper: {
		marginTop: px[2],
		display: "grid",
		width: px[28],
		height: px[28],
		flexShrink: 0,
		placeItems: "center",
		borderRadius: radius.full,
	},
})

const TOAST_TONE_STYLES = {
	notification: {
		toast: styles.notificationToast,
		accentLine: styles.notificationAccent,
		iconWrapper: styles.notificationIcon,
		close: styles.notificationClose,
		progressFill: styles.notificationAccent,
		Icon: InfoCircledIcon,
	},
	success: {
		toast: styles.successToast,
		accentLine: styles.successAccent,
		iconWrapper: styles.successIcon,
		close: styles.successClose,
		progressFill: styles.successAccent,
		Icon: CheckIcon,
	},
	error: {
		toast: styles.errorToast,
		accentLine: styles.errorAccent,
		iconWrapper: styles.errorIcon,
		close: styles.errorClose,
		progressFill: styles.errorAccent,
		Icon: ExclamationTriangleIcon,
	},
} satisfies Record<ToastTone, ToastToneStyle>

export function showToast(options: ShowToastOptions) {
	return Toast.toaster.show((props) => (
		<AppToast
			{...props}
			{...options}
		/>
	))
}

export function showNotificationToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "notification" })
}

export function showSuccessToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "success" })
}

export function showErrorToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "error" })
}

export function AppToastRegion() {
	const { t } = useLingui()
	return (
		<Toast.Region
			aria-label={t`Notifications ({hotkey})`}
			duration={3600}
			limit={3}
			{...stylex.attrs(styles.region)}
		>
			<Toast.List {...stylex.attrs(styles.list)} />
		</Toast.Region>
	)
}

function AppToast(props: AppToastProps) {
	const [local, rootProps] = splitProps(props, ["title", "description", "tone"])
	const tone = createMemo(() => TOAST_TONE_STYLES[local.tone])

	return (
		<Toast.Root
			{...rootProps}
			{...stylex.attrs(styles.toast, tone().toast)}
		>
			<div {...stylex.attrs(styles.accent, tone().accentLine)}></div>
			<ToastIcon tone={local.tone} />
			<div {...stylex.attrs(styles.body)}>
				<Toast.Title {...stylex.attrs(styles.title)}>{local.title}</Toast.Title>
				<Show when={local.description}>
					{(description) => (
						<Toast.Description {...stylex.attrs(styles.description)}>
							{description()}
						</Toast.Description>
					)}
				</Show>
			</div>
			<Toast.CloseButton {...stylex.attrs(styles.close, tone().close)}>
				<Cross1Icon
					aria-hidden="true"
					{...stylex.attrs(styles.icon)}
				/>
			</Toast.CloseButton>
			<Toast.ProgressTrack {...stylex.attrs(styles.track)}>
				<Toast.ProgressFill
					{...stylex.attrs(styles.fill, tone().progressFill)}
				/>
			</Toast.ProgressTrack>
		</Toast.Root>
	)
}

function ToastIcon(props: { tone: ToastTone }) {
	const tone = createMemo(() => TOAST_TONE_STYLES[props.tone])

	return (
		<span {...stylex.attrs(styles.iconWrapper, tone().iconWrapper)}>
			{tone().Icon({
				"aria-hidden": "true",
				...stylex.attrs(styles.icon),
			})}
		</span>
	)
}
