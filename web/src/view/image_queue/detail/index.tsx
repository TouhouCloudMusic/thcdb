import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show, untrack } from "solid-js"

import { Button } from "~/component/atomic/button"
import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import {
	colors,
	fontSizes,
	lineHeights,
	px,
	radius,
} from "~/style/tokens.stylex"

import { useImageQueueDetail } from "./state"
import { ImageQueueBreadcrumb, ImageQueueDetailView } from "./view"

const pageStyles = stylex.create({
	page: {
		height: "auto",
		minHeight: "100%",
		padding: { default: px[16], "@container (min-width: 44rem)": px[32] },
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
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: px[12],
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
})

type Props = { entryId: number }

function ImageQueueDetailEntry(props: Props) {
	const { t } = useLingui()
	const { state, comments } = useImageQueueDetail(untrack(() => props.entryId))
	const entry = () => {
		const current = state()
		return current.kind === "error" ? current.cachedData : current.data
	}
	const failure = () => {
		const current = state()
		if (current.kind === "error") return current
	}

	return (
		<PageLayout styles={pageStyles.page}>
			<Show when={!entry()}>
				<ImageQueueBreadcrumb />
			</Show>
			<Show when={state().kind === "loading"}>
				<div {...stylex.attrs(pageStyles.loadingNotice)}>{t`Loading…`}</div>
			</Show>
			<Show when={failure()}>
				{(error) => (
					<div {...stylex.attrs(pageStyles.errorNotice)}>
						<p role="alert">
							{error().cachedData
								? t`Failed to refresh image queue entry.`
								: t`Failed to load image queue entry.`}
						</p>
						<Button
							appearance="outline"
							tone="slate"
							size="sm"
							disabled={error().retrying}
							onClick={error().retry}
						>
							{t`Retry`}
						</Button>
					</div>
				)}
			</Show>
			<Show when={entry()}>
				{(view) => (
					<ImageQueueDetailView
						{...view()}
						comments={comments}
					/>
				)}
			</Show>
		</PageLayout>
	)
}

export function ImageQueueDetailPage(props: Props) {
	return (
		<Show
			when={props.entryId}
			keyed
		>
			{(entryId) => <ImageQueueDetailEntry entryId={entryId} />}
		</Show>
	)
}
