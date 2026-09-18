import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Match, Show, Switch } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { Button } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { Intersperse } from "~/component/data/Intersperse"
import { ExploreFilterField } from "~/component/feature/entity_explore/ExploreFilterField"
import type {
	ArtistCreditScope,
	ArtistCreditSort,
	ArtistCredits as CreditsData,
	CreditRoleRef,
} from "~/hey-api"
import { link } from "~/style/link"
import { dividerStyles, infoStyles } from "~/style/primitives"
import { colors, fontSizes, px, radius } from "~/style/tokens.stylex"
import { CollectionLoadMore } from "~/view/collection/CollectionLoadMore"
import { ReleaseItem } from "~/view/release/ReleaseItems"

import { formatCreditRange, groupCreditRanges } from "./ArtistCreditRanges"
import type { CreditRangeGroup } from "./ArtistCreditRanges"

const trackCollator = new Intl.Collator(undefined, { numeric: true })

const styles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		rowGap: px[16],
		minWidth: 0,
	},
	filters: {
		gridColumn: "1 / -1",
		display: "grid",
		gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${px[128]}), max-content))`,
		gap: px[16],
		alignItems: "start",
		minWidth: 0,
	},
	groups: {
		gridColumn: "1 / -1",
		display: "grid",
		gridTemplateColumns: `${px[64]} minmax(0, 1fr)`,
		columnGap: px[16],
		minWidth: 0,
	},
	results: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		rowGap: px[8],
		minWidth: 0,
	},
	divider: { gridColumn: "1 / -1", marginBlock: px[16] },
	subgrid: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		minWidth: 0,
	},
	songTitle: { fontSize: fontSizes.base, lineHeight: px[20] },
	creditRow: {
		minHeight: px[32],
		paddingBlockStart: px[16],
		alignItems: "baseline",
	},
	roles: {
		gridColumn: "2",
		overflowWrap: "anywhere",
	},
	roleText: { lineHeight: px[16] },
	track: {
		fontSize: fontSizes.sm,
		lineHeight: px[16],
		fontWeight: 400,
		color: colors.textTertiary,
		textAlign: "end",
		fontVariantNumeric: "tabular-nums",
		overflowWrap: "anywhere",
	},
	songItem: {
		minHeight: px[64],
		alignItems: "start",
	},
	songCover: {
		width: px[64],
		height: px[64],
		borderRadius: radius.sm,
	},
	songDetails: {
		display: "grid",
		gridTemplateRows: `minmax(${px[20]}, auto) minmax(${px[16]}, auto)`,
		rowGap: px[6],
		alignContent: "start",
		minWidth: 0,
		overflowWrap: "anywhere",
	},
	status: {
		gridColumn: "1 / -1",
		display: "block",
		paddingBlock: px[24],
		textAlign: "center",
	},
	loadMore: {
		gridColumn: "1 / -1",
		display: "grid",
		justifyItems: "center",
	},
})

function CreditFilter<T extends string>(props: {
	label: string
	options: { value: T; label: string }[]
	value: T
	onChange: (value: T) => void
}) {
	return (
		<ExploreFilterField label={props.label}>
			<Select.Root
				options={props.options}
				optionValue="value"
				optionTextValue="label"
				value={props.options.find((option) => option.value === props.value)}
				onChange={(option) => {
					if (option !== null) props.onChange(option.value)
				}}
				itemComponent={(itemProps) => (
					<Select.Item item={itemProps.item}>
						{itemProps.item.rawValue.label}
					</Select.Item>
				)}
			>
				<Select.Trigger aria-label={props.label}>
					<Select.Value<{ value: T; label: string }>>
						{(state) => state.selectedOption().label}
					</Select.Value>
					<Select.Icon />
				</Select.Trigger>
				<Select.Portal>
					<Select.Content>
						<Select.Listbox />
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</ExploreFilterField>
	)
}

function CreditRoles(props: { roles: CreditRoleRef[]; styles?: StyleXStyles }) {
	const { t } = useLingui()
	return (
		<span {...stylex.attrs(infoStyles.label, styles.roleText, props.styles)}>
			<Show
				when={props.roles.length > 0}
				fallback={t`Unspecified role`}
			>
				<Intersperse
					of={props.roles}
					with={", "}
				>
					{(role) => (
						<Link
							to="/credit-role/$id"
							params={{ id: role.id.toString() }}
							class={
								stylex.attrs(
									link.base,
									link.withUnderline,
									infoStyles.label,
									styles.roleText,
								).class
							}
						>
							{role.name}
						</Link>
					)}
				</Intersperse>
			</Show>
		</span>
	)
}

function CreditRangeRow(props: { group: CreditRangeGroup }) {
	return (
		<li {...stylex.attrs(styles.subgrid, styles.creditRow)}>
			<span {...stylex.attrs(styles.track)}>
				{formatCreditRange(props.group.range)}
			</span>
			<CreditRoles
				roles={props.group.roles}
				styles={styles.roles}
			/>
		</li>
	)
}

export type ArtistCreditsModel = {
	data: Pick<CreditsData, "release" | "song">
	scope: ArtistCreditScope
	roleId: number | undefined
	sort: ArtistCreditSort
	roles: CreditRoleRef[]
	hasCredits: boolean
	hasNext: boolean
	isLoading: boolean
	isFetchingNextPage: boolean
	hasError: boolean
	onScopeChange: (scope: ArtistCreditScope) => void
	onRoleChange: (roleId: number | undefined) => void
	onSortChange: (sort: ArtistCreditSort) => void
	next: () => void
	retry: () => void
}

export function ArtistCredits(props: { model: ArtistCreditsModel }) {
	const { t } = useLingui()
	const groups = createMemo(() =>
		props.model.data.release.map((release) => {
			return {
				release,
				ranges: groupCreditRanges(props.model.data.song, release.release_id),
			}
		}),
	)
	const unreleased = createMemo(() =>
		props.model.data.song.filter((song) => song.primary_release_id == null),
	)
	const scopes = createMemo(
		() =>
			[
				{ value: "all", label: t`All` },
				{ value: "release", label: t`Releases` },
				{ value: "song", label: t`Songs` },
			] satisfies {
				value: ArtistCreditScope
				label: string
			}[],
	)
	const roleOptions = createMemo(() => [
		{ value: "all", label: t`All roles` },
		...props.model.roles
			.toSorted((a, b) => trackCollator.compare(a.name, b.name))
			.map((role) => ({
				value: role.id.toString(),
				label: role.name,
			})),
	])
	const sortOptions = createMemo(
		() =>
			[
				{ value: "newest", label: t`Newest first` },
				{ value: "oldest", label: t`Oldest first` },
			] satisfies {
				value: ArtistCreditSort
				label: string
			}[],
	)

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.filters)}>
				<CreditFilter
					label={t`Credit type`}
					options={scopes()}
					value={props.model.scope}
					onChange={props.model.onScopeChange}
				/>
				<CreditFilter
					label={t`Credit role`}
					options={roleOptions()}
					value={props.model.roleId?.toString() ?? "all"}
					onChange={(value) =>
						props.model.onRoleChange(
							value === "all" ? undefined : Number(value),
						)
					}
				/>
				<CreditFilter
					label={t`Sort credits`}
					options={sortOptions()}
					value={props.model.sort}
					onChange={props.model.onSortChange}
				/>
			</div>
			<div {...stylex.attrs(styles.results)}>
				<Switch>
					<Match when={props.model.isLoading}>
						<output
							{...stylex.attrs(infoStyles.label, styles.status)}
						>{t`Loading...`}</output>
					</Match>
					<Match when={groups().length > 0 || unreleased().length > 0}>
						<div {...stylex.attrs(styles.groups)}>
							<For each={groups()}>
								{(group, groupIndex) => (
									<>
										<Show when={groupIndex() > 0}>
											<div
												{...stylex.attrs(
													dividerStyles.horizontal,
													styles.divider,
												)}
											></div>
										</Show>
										<div {...stylex.attrs(styles.subgrid)}>
											<ReleaseItem
												styles={styles.subgrid}
												release={{
													id: group.release.release_id,
													title: group.release.title,
													artists: group.release.artist,
													cover_art_url: group.release.cover_url,
													release_type: group.release.release_type,
													release_date: group.release.release_date,
												}}
											/>
											<Show
												when={
													group.release.roles.length > 0
													|| group.ranges.length > 0
												}
											>
												<ul {...stylex.attrs(styles.subgrid)}>
													<Show when={group.release.roles.length > 0}>
														<li
															{...stylex.attrs(
																styles.subgrid,
																styles.creditRow,
															)}
															aria-label={t`Release`}
														>
															<CreditRoles
																roles={group.release.roles}
																styles={styles.roles}
															/>
														</li>
													</Show>
													<For each={group.ranges}>
														{(rangeGroup) => (
															<CreditRangeRow group={rangeGroup} />
														)}
													</For>
												</ul>
											</Show>
										</div>
									</>
								)}
							</For>
							<For each={unreleased()}>
								{(song, songIndex) => (
									<>
										<Show when={groups().length > 0 || songIndex() > 0}>
											<div
												{...stylex.attrs(
													dividerStyles.horizontal,
													styles.divider,
												)}
											></div>
										</Show>
										<div {...stylex.attrs(styles.subgrid, styles.songItem)}>
											<Thumbnail
												src={undefined}
												aria-label={song.title}
												styles={styles.songCover}
											/>
											<div {...stylex.attrs(styles.songDetails)}>
												<Link
													to="/song/$id"
													params={{ id: song.song_id.toString() }}
													class={
														stylex.attrs(
															link.base,
															link.withUnderline,
															styles.songTitle,
														).class
													}
												>
													{song.title}
												</Link>
												<CreditRoles roles={song.roles} />
											</div>
										</div>
									</>
								)}
							</For>
						</div>
					</Match>
					<Match when={!props.model.hasError}>
						<p
							{...stylex.attrs(infoStyles.label, styles.status)}
						>{t`No matching credits`}</p>
					</Match>
				</Switch>
				<Show when={props.model.hasError}>
					<div
						role="alert"
						{...stylex.attrs(infoStyles.label, styles.status)}
					>
						{t`Could not load credits`}{" "}
						<Button
							appearance="ghost"
							tone="gray"
							size="sm"
							onClick={props.model.retry}
						>{t`Retry`}</Button>
					</div>
				</Show>
				<Show when={props.model.hasNext}>
					<div {...stylex.attrs(styles.loadMore)}>
						<CollectionLoadMore
							when={props.model.hasNext}
							isLoading={props.model.isFetchingNextPage}
							onLoadMore={props.model.next}
						/>
					</div>
				</Show>
			</div>
		</div>
	)
}
