import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import type { Song } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import { SongQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal } from "solid-js"
import type { JSX } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { EntitySearchDialog } from "./EntitySearchDialog"

const styles = stylex.create({
	trigger: { height: "max-content", padding: px[8] },
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

type SongSearchDialogProps = {
	onSelect: (song: Song) => void
	disabled?: boolean
	dataFilter?: (song: Song) => boolean
	icon: JSX.Element
}

export function SongSearchDialog(props: SongSearchDialogProps): JSX.Element {
	const { t } = useLingui()
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword()
		return keyword.length > 1 ? keyword : undefined
	})

	const songsQuery = useQuery(() => ({
		...SongQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	const items = createMemo(() => {
		if (!songsQuery.isSuccess) return [] as Song[]
		if (!props.dataFilter) return songsQuery.data
		return songsQuery.data.filter(props.dataFilter)
	})

	return (
		<EntitySearchDialog
			title={t`Search Song`}
			trigger={
				<Dialog.Trigger
					as={Button}
					disabled={props.disabled}
					appearance="ghost"
					tone="gray"
					styles={styles.trigger}
				>
					{props.icon}
				</Dialog.Trigger>
			}
			value={searchKeyword()}
			onInput={onInput}
			items={items()}
			onSelect={props.onSelect}
			item={(song) => (
				<div {...stylex.attrs(styles.row)}>
					<div {...stylex.attrs(styles.name)}>{song.title}</div>
					<div {...stylex.attrs(styles.add)}>
						<PlusIcon {...stylex.attrs(styles.icon)} />
					</div>
				</div>
			)}
		/>
	)
}
