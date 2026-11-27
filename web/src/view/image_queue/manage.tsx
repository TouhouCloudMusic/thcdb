import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { ChevronRightIcon } from "@thc/icons/radix"
import { createMemo } from "solid-js"

import { Select } from "~/component/atomic/form/select"
import { StickyFilterBar } from "~/component/feature/entity_explore"
import { IMAGE_QUEUE_STATUS_LABELS } from "~/component/image_queue/statusLabels"
import type {
	CursorResponsePendingImageQueueItem,
	ImageQueueStatus,
	ImageQueueType,
} from "~/hey-api"
import { vImageQueueStatus } from "~/hey-api/valibot.gen"
import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import type { InfiniteQueryState } from "~/utils/adapter/tanstack/infiniteQueryState"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

import { ImageQueueList } from "./list"
import { listPageStyles } from "./listPage.stylex"
import { ImageQueueDate, ImageQueueRow, rowMetadataStyles } from "./listRow"

const rowStyles = stylex.create({
	list: {
		gridTemplateColumns: {
			default: "3rem minmax(0, 1fr)",
			"@container (min-width: 40rem)":
				"3rem minmax(0, 1fr) fit-content(12rem) max-content",
		},
	},
	rowBody: {
		gridTemplateColumns: {
			default: "minmax(0, 1fr) max-content",
			"@container (min-width: 40rem)": "subgrid",
		},
		columnGap: px[8],
	},
	rowTitle: {
		gridColumn: {
			default: "1 / -2",
			"@container (min-width: 40rem)": "1 / -1",
		},
	},
	targetType: {
		gridColumn: { default: "-2 / -1", "@container (min-width: 40rem)": "1" },
		gridRow: { default: "1", "@container (min-width: 40rem)": "2" },
		justifySelf: { default: "end", "@container (min-width: 40rem)": "start" },
	},
	submitter: {
		gridColumn: {
			default: "1 / -2",
			"@container (min-width: 40rem)": "-3 / -2",
		},
		gridRow: 2,
		justifySelf: { default: "start", "@container (min-width: 40rem)": "end" },
	},
	submittedAt: { gridRow: "2" },
})

type PendingImageQueueItem =
	CursorResponsePendingImageQueueItem["items"][number]

function ManageQueueRow(props: { item: PendingImageQueueItem }) {
	const submitter = () => props.item.created_by.name
	return (
		<ImageQueueRow
			item={props.item}
			bodyStyles={rowStyles.rowBody}
			titleStyles={rowStyles.rowTitle}
			targetTypeStyles={rowStyles.targetType}
		>
			<Link
				to="/profile/$username/image-queue"
				params={{ username: submitter() }}
				title={submitter()}
				class={
					stylex.attrs(
						link.secondary,
						link.withUnderline,
						rowMetadataStyles.actor,
						rowMetadataStyles.truncated,
						rowStyles.submitter,
					).class
				}
			>
				{submitter()}
			</Link>
			<ImageQueueDate
				value={props.item.created_at}
				styles={[rowMetadataStyles.eventDate, rowStyles.submittedAt]}
			/>
		</ImageQueueRow>
	)
}

const styles = stylex.create({
	breadcrumb: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	filterBar: {
		borderColor: palette.slate[200],
		marginInline: 0,
		paddingInline: 0,
		paddingBlock: px[8],
	},
	filters: { display: "flex", flexWrap: "wrap", gap: px[16] },
	filter: { display: "flex", alignItems: "center", gap: px[8] },
	label: { fontSize: fontSizes.sm, color: colors.textTertiary },
	typeSelect: { minWidth: "6.5rem" },
	statusSelect: { minWidth: "7.5rem" },
	selectTrigger: { width: "100%" },
})

export type ImageQueueFilters = {
	type?: ImageQueueType
	status?: ImageQueueStatus
}

type ImageQueueManagePageContentProps = {
	filters: ImageQueueFilters
	list: InfiniteQueryState<PendingImageQueueItem>
	onTypeChange: (value: ImageQueueFilters["type"]) => void
	onStatusChange: (value: ImageQueueFilters["status"]) => void
}

export function ImageQueueManagePageContent(
	props: ImageQueueManagePageContentProps,
) {
	const { t } = useLingui()
	const scrollDirection = useScrollDirection()
	const typeOptions = createMemo(
		() =>
			[
				{ value: undefined, label: t`All` },
				{ value: "artist", label: t`Artist` },
				{ value: "release", label: t`Release` },
			] as const,
	)
	const statusOptions = createMemo(() => [
		{ value: undefined, label: t`All` },
		...vImageQueueStatus.options.map((value) => ({
			value,
			label: t(IMAGE_QUEUE_STATUS_LABELS[value]),
		})),
	])
	return (
		<PageLayout styles={listPageStyles.layout}>
			<header>
				<nav
					aria-label={t`Breadcrumb`}
					{...stylex.attrs(styles.breadcrumb)}
				>
					<Link
						to="/moderation"
						class={stylex.attrs(link.secondary, link.withUnderline).class}
					>{t`Moderation`}</Link>
					<ChevronRightIcon
						width={16}
						height={16}
						aria-hidden="true"
					/>
					<span aria-current="page">{t`Image Queue`}</span>
				</nav>
				<h1 {...stylex.attrs(listPageStyles.title)}>{t`Image Queue`}</h1>
			</header>

			<section>
				<StickyFilterBar
					scrollDirection={scrollDirection}
					styles={styles.filterBar}
				>
					<div {...stylex.attrs(styles.filters)}>
						<div {...stylex.attrs(styles.filter)}>
							<span {...stylex.attrs(styles.label)}>{t`Type`}</span>
							<Select.Root
								styles={styles.typeSelect}
								options={typeOptions()}
								optionValue={(option) => option.value ?? "all"}
								optionTextValue="label"
								value={typeOptions().find(
									(option) => option.value === props.filters.type,
								)}
								onChange={(option) => props.onTypeChange(option?.value)}
							>
								<Select.Trigger
									aria-label={t`Type`}
									styles={styles.selectTrigger}
								/>
								<Select.Content />
							</Select.Root>
						</div>
						<div {...stylex.attrs(styles.filter)}>
							<span {...stylex.attrs(styles.label)}>{t`Status`}</span>
							<Select.Root
								styles={styles.statusSelect}
								options={statusOptions()}
								optionValue={(option) => option.value ?? "all"}
								optionTextValue="label"
								value={statusOptions().find(
									(option) => option.value === props.filters.status,
								)}
								onChange={(option) => props.onStatusChange(option?.value)}
							>
								<Select.Trigger
									aria-label={t`Status`}
									styles={styles.selectTrigger}
								/>
								<Select.Content />
							</Select.Root>
						</div>
					</div>
				</StickyFilterBar>

				<ImageQueueList
					as="ul"
					styles={rowStyles.list}
					state={props.list}
					emptyMessage={t`No entries match the current filters.`}
					errorMessage={t`Failed to load image queue.`}
				>
					{(item) => <ManageQueueRow item={item} />}
				</ImageQueueList>
			</section>
		</PageLayout>
	)
}
