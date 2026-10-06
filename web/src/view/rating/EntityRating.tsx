import * as K_Rating from "@kobalte/core/rating"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { StarFilledIcon, StarIcon } from "@thc/icons/radix"
import { createContext, createMemo, For, Show } from "solid-js"
import type { Accessor, ParentProps } from "solid-js"
import * as v from "valibot"

import type { Rating, RatingSummary } from "~/hey-api"
import { vRating } from "~/hey-api/valibot.gen"
import { palette } from "~/style/color/palette.stylex"
import { infoStyles } from "~/style/primitives"
import { colors, px, radius } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

const RATINGS = [1, 2, 3, 4, 5] as const

const starStyles = stylex.create({
	control: {
		display: "flex",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: px[2],
	},
	pending: { opacity: 0.5 },
	star: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-start",
		width: px[24],
		height: px[24],
		color: colors.icon,
		borderRadius: radius.xs,
		outlineWidth: px[2],
		outlineStyle: "solid",
		outlineColor: {
			default: "transparent",
			":focus-visible": palette.reimu[600],
		},
		outlineOffset: `-${px[2]}`,
		cursor: { default: "pointer", ":is([data-disabled])": "wait" },
	},
	starControl: {
		position: "relative",
		width: px[16],
		height: px[16],
	},
	icon: {
		width: "100%",
		height: "100%",
		color: "inherit",
	},
	fill: { position: "absolute", inset: 0, color: palette.reimu[600] },
	half: { clipPath: "inset(0 50% 0 0)" },
})

export type EntityRatingState =
	| { status: "loading"; summary: undefined }
	| {
			status: "readonly" | "ready" | "saving"
			summary: RatingSummary
	  }

export type EntityRatingModel = {
	state: Accessor<EntityRatingState>
	setRating: (rating: Rating | null) => void
}

const RatingContext = createContext<Accessor<EntityRatingState>>()

const metadataStyles = stylex.create({
	root: {
		display: "flex",
		alignItems: "baseline",
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
		gap: px[4],
	},
	text: { color: colors.textSecondary },
})

function Summary(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const ratingState = assertContext(RatingContext, "EntityRating")
	const ratingSummary = () => ratingState().summary

	return (
		<div {...stylex.attrs(metadataStyles.root, props.styles)}>
			<Show
				when={ratingSummary()}
				fallback={
					<span
						{...stylex.attrs(metadataStyles.text)}
					>{t`Loading ratings…`}</span>
				}
			>
				{(summary) => {
					const average = () => `${summary().average?.toFixed(2) ?? "—"} / 5`

					return (
						<>
							<span {...stylex.attrs(infoStyles.detail)}>{average()}</span>
							<span
								aria-hidden="true"
								{...stylex.attrs(infoStyles.label)}
							>
								·
							</span>
							<span {...stylex.attrs(infoStyles.detail)}>
								{summary().count}
							</span>
						</>
					)
				}}
			</Show>
		</div>
	)
}

function Root(
	props: ParentProps<{
		model: EntityRatingModel
		styles?: StyleXStyles
	}>,
) {
	const ratingState = createMemo(() => props.model.state())
	const isBusy = () =>
		ratingState().status === "loading" || ratingState().status === "saving"
	const isDisabled = () => ratingState().status !== "ready"
	const userRating = () => ratingState().summary?.user_rating ?? 0

	const onChange = (value: number) => {
		const rating = value === 0 ? null : value

		props.model.setRating(v.parse(v.nullable(vRating), rating))
	}

	return (
		<RatingContext.Provider value={ratingState}>
			<K_Rating.Root
				as="section"
				allowHalf
				value={userRating()}
				disabled={isDisabled()}
				onChange={onChange}
				aria-busy={isBusy()}
				{...stylex.attrs(props.styles)}
			>
				{props.children}
			</K_Rating.Root>
		</RatingContext.Provider>
	)
}

function Label(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()

	return (
		<K_Rating.Label
			as="h2"
			{...stylex.attrs(infoStyles.label, props.styles)}
		>
			{t`Rating`}
		</K_Rating.Label>
	)
}

function Control(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const ratingState = assertContext(RatingContext, "EntityRating")
	const editable = () =>
		ratingState().status === "ready" || ratingState().status === "saving"
	const isSaving = () => ratingState().status === "saving"

	return (
		<Show when={editable()}>
			<K_Rating.Control
				{...stylex.attrs(
					starStyles.control,
					isSaving() && starStyles.pending,
					props.styles,
				)}
			>
				<For each={RATINGS}>
					{(rating) => (
						<K_Rating.Item {...stylex.attrs(starStyles.star)}>
							<K_Rating.ItemControl {...stylex.attrs(starStyles.starControl)}>
								{(state) => {
									const label = () =>
										t`${{ rating: state.half() ? rating - 0.5 : rating }} out of 5 stars`

									return (
										<>
											<K_Rating.ItemLabel>{label()}</K_Rating.ItemLabel>
											<StarIcon
												aria-hidden="true"
												{...stylex.attrs(starStyles.icon)}
											/>
											<Show when={state.highlighted()}>
												<StarFilledIcon
													aria-hidden="true"
													{...stylex.attrs(
														starStyles.icon,
														starStyles.fill,
														state.half() && starStyles.half,
													)}
												/>
											</Show>
										</>
									)
								}}
							</K_Rating.ItemControl>
						</K_Rating.Item>
					)}
				</For>
			</K_Rating.Control>
		</Show>
	)
}

export const EntityRating = { Root, Label, Summary, Control }
