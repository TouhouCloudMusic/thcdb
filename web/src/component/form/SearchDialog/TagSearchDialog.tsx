import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Tag } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { EntitySearchDialog } from "./EntitySearchDialog"
import { useTagSearch } from "./useTagSearch"

const styles = stylex.create({
	row: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	name: {
		textAlign: "left",
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: colors.textPrimary,
	},
	title: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
	type: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	add: {
		opacity: {
			default: 0,
			"@media (hover: hover)": { [stylex.when.ancestor(":hover")]: 1 },
		},
		transitionProperty: "opacity",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	icon: { width: px[16], height: px[16], color: colors.textTertiary },
})

type TagSearchDialogProps = {
	onSelect: (tag: Tag) => void
	dataFilter?: (tag: Tag) => boolean
	trigger: JSX.Element
}

export function TagSearchDialog(props: TagSearchDialogProps): JSX.Element {
	const { t } = useLingui()
	const { searchKeyword, onInput, items } = useTagSearch(() => props.dataFilter)

	return (
		<EntitySearchDialog
			title={t`Search Tag`}
			trigger={props.trigger}
			value={searchKeyword()}
			onInput={onInput}
			items={items()}
			onSelect={props.onSelect}
			item={(tag) => (
				<div {...stylex.attrs(styles.row)}>
					<div {...stylex.attrs(styles.name)}>
						<span {...stylex.attrs(styles.title)}>{tag.name}</span>
						<span {...stylex.attrs(styles.type)}>{tag.type}</span>
					</div>
					<div {...stylex.attrs(styles.add)}>
						<PlusIcon {...stylex.attrs(styles.icon)} />
					</div>
				</div>
			)}
		/>
	)
}
