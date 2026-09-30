import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For, createMemo, createSignal } from "solid-js"

import { Tab } from "~/component/atomic/Tab"
import { Select } from "~/component/atomic/form/select"
import type {
	SongRelation,
	SongRelationDirection,
	SongRelationType,
} from "~/hey-api"
import { vSongRelationType } from "~/hey-api/valibot.gen"
import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"

import { SongRelationItem } from "./SongRelationItem"

type RelationFilterOption<T extends string> = { value: T; label: string }

const filterStyles = stylex.create({
	root: { display: "grid", gap: px[8], minWidth: 0 },
	label: {
		fontSize: fontSizes.sm,
		lineHeight: px[24],
		color: colors.textTertiary,
	},
	control: { display: "grid" },
})

function RelationFilter<T extends string>(props: {
	label: string
	value: T
	options: RelationFilterOption<T>[]
	onChange: (value: T) => void
}) {
	return (
		<div {...stylex.attrs(filterStyles.root)}>
			<span {...stylex.attrs(filterStyles.label)}>{props.label}</span>
			<Select.Root
				styles={filterStyles.control}
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
					<Select.Value<RelationFilterOption<T>>>
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
		</div>
	)
}

const relationsStyles = stylex.create({
	container: { minWidth: 0 },
	filters: {
		paddingBlock: px[16],
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
	},
	filterGrid: {
		display: "grid",
		gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${px[160]}), 1fr))`,
		maxWidth: px[384],
		gap: px[16],
		alignItems: "end",
	},
	directionTabs: { flexWrap: "wrap", rowGap: px[8], paddingBlockStart: px[16] },
	directionTab: {
		display: "flex",
		height: px[32],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.md,
		paddingInline: px[12],
		textAlign: "center",
		fontSize: fontSizes.sm,
		fontWeight: 400,
		color: colors.textSecondary,
		outlineWidth: 2,
		outlineStyle: "solid",
		outlineOffset: 2,
		outlineColor: {
			default: "transparent",
			":focus-visible": palette.slate[300],
		},
		backgroundColor: {
			default: null,
			":is([data-selected])": palette.slate[100],
		},
	},
	list: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)" },
	empty: {
		paddingBlock: px[24],
		color: colors.textSecondary,
	},
})

export function SongInfoRelations(props: { relations: SongRelation[] }) {
	const { t } = useLingui()
	const [direction, setDirection] =
		createSignal<SongRelationDirection>("Derived")
	const [kind, setKind] = createSignal<SongRelationType | "All">("All")
	const [order, setOrder] = createSignal<"asc" | "desc">("asc")
	const datedRelations = createMemo(() =>
		props.relations.map((relation) => ({
			relation,
			releaseDate: relation.song.release?.release_date,
		})),
	)
	const relations = createMemo(() => {
		const sortOrder = order()
		return datedRelations()
			.filter(
				({ relation }) =>
					relation.direction === direction()
					&& (kind() === "All" || relation.type === kind()),
			)
			.toSorted((left, right) => {
				if (!left.releaseDate) return right.releaseDate ? 1 : 0
				if (!right.releaseDate) return -1
				const comparison = left.releaseDate.value.localeCompare(
					right.releaseDate.value,
				)
				return sortOrder === "asc" ? comparison : -comparison
			})
	})

	return (
		<Tab.Root
			value={direction()}
			onChange={setDirection}
			{...stylex.attrs(relationsStyles.container)}
		>
			<Tab.List
				aria-label={t`Relations`}
				styles={relationsStyles.directionTabs}
			>
				<Tab.Trigger
					value="Derived"
					styles={relationsStyles.directionTab}
				>
					{t`Based on`}
				</Tab.Trigger>
				<Tab.Trigger
					value="Source"
					styles={relationsStyles.directionTab}
				>
					{t`Derived versions`}
				</Tab.Trigger>
			</Tab.List>
			<div {...stylex.attrs(relationsStyles.filters)}>
				<div {...stylex.attrs(relationsStyles.filterGrid)}>
					<RelationFilter<SongRelationType | "All">
						label={t`Kind`}
						value={kind()}
						onChange={setKind}
						options={[
							{ value: "All", label: t`All` },
							...vSongRelationType.options.map((value) => ({
								value,
								label: value,
							})),
						]}
					/>
					<RelationFilter<"asc" | "desc">
						label={t`Release date`}
						value={order()}
						onChange={setOrder}
						options={[
							{ value: "asc", label: t`Oldest first` },
							{ value: "desc", label: t`Newest first` },
						]}
					/>
				</div>
			</div>
			<ul
				{...stylex.attrs(relationsStyles.list)}
				aria-label={t`Relations`}
			>
				<For
					each={relations()}
					fallback={
						<li
							{...stylex.attrs(relationsStyles.empty)}
						>{t`No matching relations`}</li>
					}
				>
					{(item) => <SongRelationItem relation={item.relation} />}
				</For>
			</ul>
		</Tab.Root>
	)
}
