import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { CorrectionHistoryItem, Event } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { colors, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"

import { EventInfoPageContext } from "./context"
import type { EventInfoPageContextValue } from "./context"

const styles = stylex.create({
	page: { padding: "clamp(1rem,4vw,2rem)" },
	pageContent: { display: "flex", flexDirection: "column", rowGap: px[24] },
	headerSection: { display: "flex", flexDirection: "column", rowGap: px[16] },
	title: {
		fontSize: fontSizes["3xl"],
		lineHeight: 1.25,
		fontWeight: 300,
		letterSpacing: "-.025em",
		color: colors.textPrimary,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	shortDescription: {
		letterSpacing: ".025em",
		color: colors.textTertiary,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	metadata: {
		display: "grid",
		gridTemplateColumns: "auto 1fr",
		columnGap: px[16],
		rowGap: px[8],
	},
	muted: { color: colors.textTertiary },
	dateSeparator: { whiteSpace: "pre", color: colors.textTertiary },
	alternativeNames: {
		display: "flex",
		flexWrap: "wrap",
		gap: px[2],
		whiteSpace: "pre",
	},
	separator: { whiteSpace: "pre" },
	primary: { color: colors.textPrimary },
	links: { display: "contents" },
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
})

type EventInfoPageProps = {
	event: Event
	correctionHistory: CorrectionHistoryItem[]
}

export function EventInfoPage(props: EventInfoPageProps) {
	const { t } = useLingui()
	const contextValue: EventInfoPageContextValue = {
		get event() {
			return props.event
		},
	}

	return (
		<PageLayout styles={styles.page}>
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<EventInfoPageContext.Provider value={contextValue}>
					<div {...stylex.attrs(styles.pageContent)}>
						<div {...stylex.attrs(styles.headerSection)}>
							<EventInfoHeader />
							<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
								<AddToUserCollectionButton
									entityType="Event"
									entityId={props.event.id}
								/>
							</div>
						</div>
						<EventInfoTabs />
						<EntityCorrectionMetadataSection
							entityType="event"
							entityId={props.event.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</EventInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function EventInfoHeader() {
	const { t } = useLingui()
	const ctx = assertContext(EventInfoPageContext)

	const alternativeNames = () => ctx.event.alternative_names ?? []
	const hasAlternativeNames = () => alternativeNames().length > 0
	return (
		<>
			<header>
				<h1 {...stylex.attrs(styles.title)}>{ctx.event.name}</h1>
				<p {...stylex.attrs(styles.shortDescription)}>
					{ctx.event.short_description ?? t`Short description is not provided`}
				</p>
			</header>
			<div {...stylex.attrs(styles.metadata)}>
				<span {...stylex.attrs(styles.muted)}>{t`Date`}</span>

				<Show
					when={ctx.event.start_date}
					fallback={<span>{t`N/A`}</span>}
				>
					<div>
						<span>{DateWithPrecision.display(ctx.event.start_date)}</span>
						<Show when={ctx.event.end_date}>
							<span {...stylex.attrs(styles.dateSeparator)}> - </span>
							<span>{DateWithPrecision.display(ctx.event.end_date)}</span>
						</Show>
					</div>
				</Show>
				<Show when={hasAlternativeNames()}>
					<span {...stylex.attrs(styles.muted)}>{t`AKAs`}</span>
					<ul {...stylex.attrs(styles.alternativeNames)}>
						<Intersperse
							of={alternativeNames()}
							with={<span {...stylex.attrs(styles.separator)}>, </span>}
						>
							{(alt) => <li {...stylex.attrs(styles.primary)}>{alt.name}</li>}
						</Intersperse>
					</ul>
				</Show>
				<ExternalLinks
					links={ctx.event.links}
					styles={styles.links}
					labelStyles={styles.muted}
				/>
			</div>
		</>
	)
}

function EventInfoTabs() {
	const { t } = useLingui()
	const ctx = assertContext(EventInfoPageContext)
	const [activeTab, setActiveTab] = createSignal(
		ctx.event.description ? "Description" : "Comments",
	)
	const comments = useEntityComments(() => ({
		entityType: "event",
		entityId: ctx.event.id,
		listEnabled: activeTab() === "Comments",
	}))
	const hasDescription = () => Boolean(ctx.event.description)
	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<Show when={hasDescription()}>
						<Tab.Trigger
							value="Description"
							styles={styles.tabTrigger}
						>
							{t`Description`}
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
			<Show when={hasDescription()}>
				<Tab.Content
					value="Description"
					styles={styles.tabContent}
				>
					<EventInfoDescription />
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
					entityType="event"
					entityId={ctx.event.id}
					enabled={activeTab() === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}

function EventInfoDescription() {
	const ctx = assertContext(EventInfoPageContext)
	return (
		<div {...stylex.attrs(styles.descriptionContainer)}>
			<p {...stylex.attrs(styles.description)}>{ctx.event.description}</p>
		</div>
	)
}
