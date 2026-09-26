import { useLingui } from "@lingui/solid/macro"
import { createWritableMemo } from "@solid-primitives/memo"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { TagRelation } from "@thc/api"
import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	on,
	Show,
} from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { TagInfoPageContext } from "./context"
import { createRelationConnections } from "./relationConnections"

const COLLAPSED_RELATION_COUNT = 3

const relationStyles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		gap: px[8],
		minWidth: 0,
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		fontWeight: 400,
		color: colors.textTertiary,
	},
	header: {
		display: "grid",
		alignContent: "center",
		alignItems: "baseline",
		height: px[32],
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
	},
	heading: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: colors.textPrimary,
	},
	tree: {
		position: "relative",
		isolation: "isolate",
		width: px[256],
		maxWidth: "100%",
		justifySelf: "center",
	},
	connectionLayer: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
		color: palette.slate[300],
	},
	list: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		gridAutoRows: `minmax(${px[24]}, auto)`,
		rowGap: px[8],
	},
	currentTag: {
		minHeight: px[32],
		overflowWrap: "anywhere",
		color: colors.textPrimary,
	},
})

function TagRelationTree() {
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)
	const listId = createUniqueId()
	const [container, setContainer] = createSignal<HTMLDivElement>()
	const [currentAnchor, setCurrentAnchor] = createSignal<HTMLSpanElement>()
	const connections = createRelationConnections(container, currentAnchor)

	const parents = createMemo(
		() =>
			ctx.tag.relations?.filter((relation) => relation.type === "Inherit")
			?? [],
	)
	const children = createMemo(
		() =>
			ctx.tag.relations?.filter((relation) => relation.type === "Derive") ?? [],
	)

	const currentIndentLevel = () => (parents().length > 0 ? 1 : 0)
	const childIndentLevel = () => currentIndentLevel() + 1

	return (
		<aside
			{...stylex.attrs(relationStyles.root)}
			aria-label={t`Relations`}
		>
			<header {...stylex.attrs(relationStyles.header)}>
				<h2 {...stylex.attrs(relationStyles.heading)}>{t`Relations`}</h2>
			</header>
			<div
				ref={setContainer}
				{...stylex.attrs(relationStyles.tree)}
			>
				<svg
					{...stylex.attrs(relationStyles.connectionLayer)}
					aria-hidden="true"
				>
					<For each={connections.lines()}>
						{(line) => (
							<polyline
								points={line.map((point) => `${point.x},${point.y}`).join(" ")}
								fill="none"
								stroke="currentColor"
								stroke-width="1"
							></polyline>
						)}
					</For>
				</svg>
				<ul
					id={listId}
					{...stylex.attrs(relationStyles.list)}
				>
					<TagRelationRows
						relations={parents()}
						indentLevel={0}
						label={t`Parents`}
						listId={listId}
						registerAnchor={(element) =>
							connections.registerAnchor("parents", element)
						}
					/>
					<li
						style={{
							"padding-inline-start": `calc(${currentIndentLevel()} * ${px[32]})`,
						}}
						{...stylex.attrs(relationStyles.currentTag)}
						aria-current="page"
					>
						<TagRelationName
							name={ctx.tag.name}
							ref={setCurrentAnchor}
						/>
					</li>
					<TagRelationRows
						relations={children()}
						indentLevel={childIndentLevel()}
						label={t`Children`}
						listId={listId}
						registerAnchor={(element) =>
							connections.registerAnchor("children", element)
						}
					/>
				</ul>
			</div>
		</aside>
	)
}

export function TagInfoRelations() {
	const ctx = assertContext(TagInfoPageContext)

	return (
		<Show when={ctx.tag.relations?.length}>
			<TagRelationTree />
		</Show>
	)
}

const relationNameStyles = stylex.create({
	name: {
		position: "relative",
		zIndex: 1,
		backgroundColor: colors.backgroundPrimary,
	},
})

function TagRelationName(props: {
	name: string
	ref?: (element: HTMLSpanElement) => void
}) {
	const nameParts = createMemo(() => {
		const [first = "", ...remainder] = Array.from(props.name)
		return { first, remainder: remainder.join("") }
	})

	return (
		<span {...stylex.attrs(relationNameStyles.name)}>
			<span ref={props.ref}>{nameParts().first}</span>
			{nameParts().remainder}
		</span>
	)
}

const relationRowStyles = stylex.create({
	relation: { overflowWrap: "anywhere" },
	link: { color: "inherit" },
	toggle: {
		position: "relative",
		zIndex: 1,
		display: "block",
		minHeight: px[24],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		backgroundColor: colors.backgroundPrimary,
		textAlign: "start",
		cursor: "pointer",
	},
})

function TagRelationRow(props: {
	relation: TagRelation
	indentLevel: number
	label: string
	registerAnchor: (element: HTMLSpanElement) => void
}) {
	return (
		<li
			style={{
				"padding-inline-start": `calc(${props.indentLevel} * ${px[32]})`,
			}}
			{...stylex.attrs(relationRowStyles.relation)}
		>
			<Link
				to="/tag/$id"
				params={{ id: props.relation.tag.id.toString() }}
				aria-label={`${props.label}: ${props.relation.tag.name}`}
				{...stylex.attrs(link.base, link.withUnderline, relationRowStyles.link)}
			>
				<TagRelationName
					name={props.relation.tag.name}
					ref={props.registerAnchor}
				/>
			</Link>
		</li>
	)
}

function TagRelationRows(props: {
	relations: TagRelation[]
	indentLevel: number
	label: string
	listId: string
	registerAnchor: (element: HTMLSpanElement) => void
}) {
	const { t } = useLingui()
	const [isExpanded, setExpanded] = createWritableMemo(
		on(
			() => props.relations,
			() => false,
		),
	)

	const toggleExpanded = () => setExpanded((expanded) => !expanded)

	const hiddenCount = () =>
		Math.max(0, props.relations.length - COLLAPSED_RELATION_COUNT)

	const visibleRelations = () =>
		isExpanded()
			? props.relations
			: props.relations.slice(0, COLLAPSED_RELATION_COUNT)

	return (
		<>
			<For each={visibleRelations()}>
				{(relation) => (
					<TagRelationRow
						relation={relation}
						indentLevel={props.indentLevel}
						label={props.label}
						registerAnchor={props.registerAnchor}
					/>
				)}
			</For>
			<Show when={hiddenCount() > 0}>
				<li
					style={{
						"padding-inline-start": `calc(${props.indentLevel} * ${px[32]})`,
					}}
					{...stylex.attrs(relationRowStyles.relation)}
				>
					<button
						type="button"
						aria-expanded={isExpanded()}
						aria-controls={props.listId}
						onClick={toggleExpanded}
						{...stylex.attrs(
							link.base,
							link.withUnderline,
							relationRowStyles.toggle,
						)}
					>
						{isExpanded() ? t`Collapse` : t`Show ${hiddenCount()} more`}
					</button>
				</li>
			</Show>
		</>
	)
}
