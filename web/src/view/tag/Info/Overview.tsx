import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { colors, fontSizes, px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"

import { TagInfoRelations } from "./Relations"
import { TagInfoPageContext } from "./context"

const overviewStyles = stylex.create({
	overview: {
		display: "grid",
		gridColumn: "1 / -1",
		gridTemplateColumns: {
			default: "minmax(0, 1fr)",
			"@container (min-width: 50rem)": `minmax(0, 1fr) minmax(0, ${px[256]})`,
		},
		columnGap: px[64],
		rowGap: px[32],
		alignItems: "start",
	},
	info: {
		display: "grid",
		gridColumn: "1",
		gridTemplateColumns: `${px[64]} minmax(0, 1fr)`,
		gridTemplateRows: "auto auto",
		alignItems: "start",
		rowGap: px[32],
		minWidth: 0,
	},
	summary: {
		display: "grid",
		gridColumn: "1 / -1",
		gridTemplateColumns: "subgrid",
		rowGap: px[32],
	},
})

const descriptionStyles = stylex.create({
	section: {
		display: "grid",
		gridColumn: "1 / -1",
		gridRow: "2",
		alignContent: "start",
		gap: px[32],
	},
	actions: {
		display: { default: "grid", ":empty": "none" },
		gridAutoFlow: "column",
		gridAutoColumns: "max-content",
		justifyContent: "start",
		minHeight: px[32],
		alignItems: "center",
		gap: px[8],
	},
	description: {
		maxInlineSize: "65ch",
		fontSize: fontSizes.base,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
		color: colors.textSecondary,
	},
})

export function TagInfoOverview() {
	const ctx = assertContext(TagInfoPageContext)

	return (
		<div {...stylex.attrs(overviewStyles.overview)}>
			<div {...stylex.attrs(overviewStyles.info)}>
				<div {...stylex.attrs(overviewStyles.summary)}>
					<TagInfoHeader />
					<TagInfoDetails />
				</div>
				<div {...stylex.attrs(descriptionStyles.section)}>
					<Show when={ctx.tag.description}>
						{(description) => (
							<p {...stylex.attrs(descriptionStyles.description)}>
								{description()}
							</p>
						)}
					</Show>
					<div {...stylex.attrs(descriptionStyles.actions)}>
						<AddToUserCollectionButton
							entityType="Tag"
							entityId={ctx.tag.id}
						/>
					</div>
				</div>
			</div>
			<TagInfoRelations />
		</div>
	)
}

const headerStyles = stylex.create({
	header: { display: "grid", alignContent: "start", gridColumn: "1 / -1" },
	shortDescription: { color: colors.textSecondary },
})

function TagInfoHeader() {
	const ctx = assertContext(TagInfoPageContext)

	return (
		<header {...stylex.attrs(headerStyles.header)}>
			<h1 {...stylex.attrs(typography.heading.md)}>{ctx.tag.name}</h1>
			<Show when={ctx.tag.short_description}>
				<p {...stylex.attrs(headerStyles.shortDescription)}>
					{ctx.tag.short_description}
				</p>
			</Show>
		</header>
	)
}

const detailsStyles = stylex.create({
	metadata: {
		gridColumn: "1 / -1",
		display: "grid",
		gridTemplateColumns: "subgrid",
		rowGap: px[4],
		fontSize: fontSizes.base,
	},
	label: { color: colors.textTertiary },
	alternativeNames: { display: "flex", flexWrap: "wrap", whiteSpace: "pre" },
	secondary: { color: colors.textSecondary },
})

function TagInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)

	return (
		<div {...stylex.attrs(detailsStyles.metadata)}>
			<div {...stylex.attrs(detailsStyles.label)}>{t`Type`}</div>
			<div {...stylex.attrs(detailsStyles.secondary)}>{ctx.tag.type}</div>
			<Show when={ctx.tag.alt_names && ctx.tag.alt_names.length > 0}>
				<span {...stylex.attrs(detailsStyles.label)}>{t`AKAs`}</span>
				<ul {...stylex.attrs(detailsStyles.alternativeNames)}>
					<Intersperse
						of={ctx.tag.alt_names}
						with={<span>, </span>}
					>
						{(alternativeName) => (
							<li {...stylex.attrs(detailsStyles.secondary)}>
								{alternativeName.name}
							</li>
						)}
					</Intersperse>
				</ul>
			</Show>
		</div>
	)
}
