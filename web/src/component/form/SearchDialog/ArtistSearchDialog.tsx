import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import { ArtistQueryOption } from "@thc/query"
import { debounce } from "@thc/toolkit"
import { createSignal, createMemo } from "solid-js"
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

type ArtistSearchDialogProps = {
	onSelect: (artist: Artist) => void
	disabled?: boolean
	queryFilter?: ArtistCommonFilter
	dataFilter?: (artist: Artist) => boolean
	icon: JSX.Element
}

export function ArtistSearchDialog(
	props: ArtistSearchDialogProps,
): JSX.Element {
	const { t } = useLingui()
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const artistsQuery = useQuery(() => ({
		...ArtistQueryOption.findByKeyword(searchTerm()!, {
			artist_type: props.queryFilter?.artist_type,
			exclusion: props.queryFilter?.exclusion,
		}),
		placeholderData: (artist) => {
			if (!artist) return
			if (props.dataFilter) {
				return artist.filter(props.dataFilter)
			}
			return artist
		},
		enabled: Boolean(searchTerm()),
	}))

	return (
		<EntitySearchDialog
			title={t`Search Artist`}
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
			items={
				artistsQuery.isSuccess
					? props.dataFilter
						? artistsQuery.data.filter(props.dataFilter)
						: artistsQuery.data
					: []
			}
			onSelect={props.onSelect}
			item={(artist) => (
				<div {...stylex.attrs(styles.row)}>
					<div {...stylex.attrs(styles.name)}>{artist.name}</div>
					<div {...stylex.attrs(styles.add)}>
						<PlusIcon {...stylex.attrs(styles.icon)} />
					</div>
				</div>
			)}
		/>
	)
}
