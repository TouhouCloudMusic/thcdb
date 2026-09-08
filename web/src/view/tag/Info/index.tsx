import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { CorrectionHistoryItem, Tag } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { Intersperse } from "~/component/data/Intersperse"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"

import { TagInfoPageContext } from "./context"
import type { TagInfoPageContextValue } from "./context"

const styles = stylex.create({
	page: { padding: "clamp(1rem,4vw,2rem)" },
	pageContent: { display: "flex", flexDirection: "column", rowGap: px[24] },
	title: {
		fontSize: fontSizes["3xl"],
		lineHeight: 1.25,
		fontWeight: 300,
		letterSpacing: "-.025em",
		color: colors.textPrimary,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	shortDescription: {
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		fontWeight: 300,
		letterSpacing: ".025em",
		color: colors.textTertiary,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	metadata: {
		display: "grid",
		gridTemplateColumns: "auto 1fr",
		columnGap: px[16],
		rowGap: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	muted: { color: colors.textTertiary },
	alternativeNames: { display: "flex", flexWrap: "wrap", whiteSpace: "pre" },
	secondary: { color: colors.textSecondary },
	tabTrigger: { paddingBlock: px[12] },
	tabContent: { padding: px[16] },
	descriptionContainer: { padding: px[8] },
	description: {
		fontSize: fontSizes.base,
		lineHeight: 1.625,
		fontWeight: 300,
		whiteSpace: "pre-wrap",
		color: colors.textSecondary,
	},
	relationsList: {
		overflow: "hidden",
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
	},
	relation: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		gap: px[16],
		padding: px[16],
		borderBottomWidth: { default: 0, ":not(:last-child)": "1px" },
		borderTopWidth: 0,
		borderStyle: "solid",
		borderColor: palette.slate[300],
	},
	field: { display: "flex", flexDirection: "column" },
	tagType: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	relationType: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
})

type Props = {
	tag: Tag
	correctionHistory: CorrectionHistoryItem[]
}

export function TagInfoPage(props: Props) {
	const { t } = useLingui()
	const contextValue: TagInfoPageContextValue = {
		get tag() {
			return props.tag
		},
	}

	return (
		<PageLayout styles={styles.page}>
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<TagInfoPageContext.Provider value={contextValue}>
					<div {...stylex.attrs(styles.pageContent)}>
						<TagInfoHeader />
						<TagInfoDetails />
						<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
							<AddToUserCollectionButton
								entityType="Tag"
								entityId={props.tag.id}
							/>
						</div>
						<TagInfoTabs />
						<EntityCorrectionMetadataSection
							entityType="tag"
							entityId={props.tag.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</TagInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function TagInfoHeader() {
	const ctx = assertContext(TagInfoPageContext)
	return (
		<header>
			<h1 {...stylex.attrs(styles.title)}>{ctx.tag.name}</h1>
			<Show when={ctx.tag.short_description}>
				<p {...stylex.attrs(styles.shortDescription)}>
					{ctx.tag.short_description}
				</p>
			</Show>
		</header>
	)
}

function TagInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)
	return (
		<div {...stylex.attrs(styles.metadata)}>
			<div {...stylex.attrs(styles.muted)}>{t`Type`}</div>
			<div>{ctx.tag.type}</div>
			<Show when={ctx.tag.alt_names && ctx.tag.alt_names.length > 0}>
				<span {...stylex.attrs(styles.muted)}>{t`AKAs`}</span>
				<ul {...stylex.attrs(styles.alternativeNames)}>
					<Intersperse
						of={ctx.tag.alt_names}
						with={<span>, </span>}
					>
						{(x) => <li {...stylex.attrs(styles.secondary)}>{x.name}</li>}
					</Intersperse>
				</ul>
			</Show>
		</div>
	)
}

function TagInfoTabs() {
	const { t } = useLingui()
	const ctx = assertContext(TagInfoPageContext)
	const hasDesc = () => Boolean(ctx.tag.description)
	const hasRelations = () =>
		Boolean(ctx.tag.relations && ctx.tag.relations.length > 0)
	const [activeTab, setActiveTab] = createSignal(
		hasDesc() ? "Description" : hasRelations() ? "Relations" : "Comments",
	)
	const comments = useEntityComments(() => ({
		entityType: "tag",
		entityId: ctx.tag.id,
		listEnabled: activeTab() === "Comments",
	}))
	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<Show when={hasDesc()}>
						<Tab.Trigger
							value="Description"
							styles={styles.tabTrigger}
						>
							{t`Description`}
						</Tab.Trigger>
					</Show>
					<Show when={hasRelations()}>
						<Tab.Trigger
							value="Relations"
							styles={styles.tabTrigger}
						>
							{t`Relations`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={comments.activeCommentCount()}
						styles={styles.tabTrigger}
					/>
					<Tab.Trigger
						value="Collections"
						styles={styles.tabTrigger}
					>
						{t`Collections`}
					</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Show when={hasDesc()}>
				<Tab.Content
					value="Description"
					styles={styles.tabContent}
				>
					<TagInfoDescription />
				</Tab.Content>
			</Show>
			<Show when={hasRelations()}>
				<Tab.Content
					value="Relations"
					styles={styles.tabContent}
				>
					<TagInfoRelations />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Comments"
				styles={styles.tabContent}
			>
				<EntityComments model={comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				styles={styles.tabContent}
			>
				<EntityCollectionsTab
					entityType="tag"
					entityId={ctx.tag.id}
					enabled={activeTab() === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}

function TagInfoDescription() {
	const ctx = assertContext(TagInfoPageContext)
	return (
		<div {...stylex.attrs(styles.descriptionContainer)}>
			<p {...stylex.attrs(styles.description)}>{ctx.tag.description}</p>
		</div>
	)
}

function TagInfoRelations() {
	const ctx = assertContext(TagInfoPageContext)
	const list = () => ctx.tag.relations ?? []
	return (
		<div>
			<ul {...stylex.attrs(styles.relationsList)}>
				{list().map((rel) => (
					<li {...stylex.attrs(styles.relation)}>
						<div {...stylex.attrs(styles.field)}>
							<Link
								class={stylex.attrs(link.base, link.text).class}
								to="/tag/$id"
								params={{ id: rel.tag.id.toString() }}
							>
								{rel.tag.name}
							</Link>
							<span {...stylex.attrs(styles.tagType)}>{rel.tag.type}</span>
						</div>
						<span {...stylex.attrs(styles.relationType)}>{rel.type}</span>
					</li>
				))}
			</ul>
		</div>
	)
}
