import {
	getInput,
	insert,
	remove,
	useField,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Artist } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { Nil } from "@thc/toolkit/data"
import { createMemo } from "solid-js"
import type { JSX } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles, formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useArtistForm } from "../../context"
import { MembershipRoleField } from "./role"
import { TenureFieldArray } from "./tenure"

const styles = stylex.create({
	field: {
		display: "grid",
		minHeight: px[128],
		width: px[384],
		minWidth: "fit-content",
		gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
	},
	fieldHeader: {
		marginBottom: px[8],
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	label: {
		margin: 0,
	},
	actionIcon: {
		width: px[16],
		height: px[16],
		color: palette.slate[600],
	},
	entries: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
	},
	firstDivider: {
		marginBottom: px[8],
	},
	entryDivider: {
		marginBlock: px[8],
	},
	lastDivider: {
		marginTop: px[8],
	},
})

const itemStyles = stylex.create({
	entry: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
	},
	entryHeader: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
	},
	removeButton: {
		padding: px[6],
	},
})

function MembershipRow(props: { membershipIndex: number }) {
	const { formStore } = useArtistForm()

	const artist = useField(formStore, () => ({
		path: ["data", "memberships", props.membershipIndex, "artist"],
	}))

	const removeMembership = () =>
		remove(formStore, {
			path: ["data", "memberships"],
			at: props.membershipIndex,
		})

	return (
		<li {...stylex.attrs(itemStyles.entry)}>
			<div {...stylex.attrs(itemStyles.entryHeader)}>
				<div>{artist.input?.name}</div>
				<Button
					onClick={removeMembership}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={itemStyles.removeButton}
				>
					<Cross1Icon />
				</Button>
			</div>
			<MembershipRoleField membershipIndex={props.membershipIndex} />
			<TenureFieldArray membershipIndex={props.membershipIndex} />
		</li>
	)
}

export function ArtistFormMembership(props: {
	styles?: StyleXStyles
}): JSX.Element {
	const { t } = useLingui()
	const context = useArtistForm()
	const { formStore } = context

	const memberships = useFieldArray(formStore, {
		path: ["data", "memberships"],
	})

	const artistType = useField(formStore, {
		path: ["data", "artist_type"],
	})

	const selectedMemberships = () =>
		getInput(formStore, { path: memberships.path })

	const isAvailableArtist = (artist: Artist) =>
		artist.id !== context.artistId
		&& !selectedMemberships().some(
			(membership) => membership.artist?.id === artist.id,
		)

	const isDisabled = () => !artistType.input || artistType.input === "Unknown"

	const artistSearchFilter = createMemo(() => {
		const exclusion = selectedMemberships().map(({ artist }) => artist!.id)

		if (context.artistId !== undefined) exclusion.push(context.artistId)

		return {
			artist_type: Nil.map((value) => [value], artistType.input),
			exclusion,
		}
	})

	const addMembership = (artist: Artist) => {
		if (!isAvailableArtist(artist)) return

		insert(formStore, {
			path: memberships.path,
			initialInput: { artist },
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Membership`}</label>
				<ArtistSearchDialog
					onSelect={addMembership}
					disabled={isDisabled()}
					queryFilter={artistSearchFilter()}
					filter={isAvailableArtist}
					icon={<PlusIcon {...stylex.attrs(styles.actionIcon)} />}
				/>
			</div>
			<ul {...stylex.attrs(styles.entries)}>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.firstDivider)}
				></span>
				<Intersperse
					of={memberships.items}
					with={
						<span
							{...stylex.attrs(dividerStyles.horizontal, styles.entryDivider)}
						></span>
					}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <MembershipRow membershipIndex={index()} />}
				</Intersperse>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.lastDivider)}
				></span>
			</ul>
		</div>
	)
}
