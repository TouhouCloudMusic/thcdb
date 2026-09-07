/* @refresh reload */
import { Field, getInput, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Artist, ArtistCommonFilter, CreditRoleRef } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { createMemo, untrack } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"

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

type MembershipItem = Pick<Artist, "id" | "name"> & {
	roles: CreditRoleRef[]
}

type ArtistMembership = NonNullable<Artist["memberships"]>[number]

function createMembershipStore(initial: MembershipItem[]) {
	const [membershipStore, setMembershipStore] =
		createStore<MembershipItem[]>(initial)

	const has = (artistId: number) =>
		membershipStore.some((membership) => membership.id === artistId)

	return {
		get inner() {
			return membershipStore
		},
		has,
		push: (artist: Artist): void => {
			setMembershipStore(
				produce((s) => {
					s.push({ id: artist.id, name: artist.name, roles: [] })
				}),
			)
		},
		remove: (idx: number): void => {
			setMembershipStore(
				produce((s) => {
					s.splice(idx, 1)
				}),
			)
		},
	}
}

export function ArtistFormMembership(props: {
	styles?: StyleXStyles
	initMemberships?: ArtistMembership[]
}): JSX.Element {
	const { t } = useLingui()
	const context = useArtistForm()
	const { formStore } = context

	const membership = createMembershipStore(
		untrack(() =>
			(props.initMemberships ?? []).map((m) => ({
				id: m.artist_id,
				name: `#${m.artist_id}`,
				roles: m.roles ?? [],
			})),
		),
	)
	const type = createMemo(() =>
		getInput(formStore, { path: ["data", "artist_type"] }),
	)

	const isDisabled = createMemo(() => {
		return !type() || type() === "Unknown"
	})

	const exclusion = createMemo(() => {
		const arr = membership.inner.map((x) => x.id)
		if (context.artistId !== undefined) {
			arr.push(context.artistId)
		}
		return arr
	})

	const filter = createMemo<ArtistCommonFilter>(() => {
		const ty = type()
		return {
			artist_type: ty ? [ty] : undefined,
			exclusion: exclusion(),
		}
	})

	const addMembership = (artist: Artist) => {
		if (membership.has(artist.id)) return

		membership.push(artist)
		insert(formStore, {
			path: ["data", "memberships"],
			initialInput: { artist_id: artist.id, roles: [], tenure: [] },
		})
	}

	const removeMembershipAt = (index: number) => () => {
		membership.remove(index)
		remove(formStore, { path: ["data", "memberships"], at: index })
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
					queryFilter={filter()}
					dataFilter={(artist) => !membership.has(artist.id)}
					icon={<PlusIcon {...stylex.attrs(styles.actionIcon)} />}
				/>
			</div>
			<ul {...stylex.attrs(styles.entries)}>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.firstDivider)}
				></span>
				<Intersperse
					of={membership.inner}
					with={
						<span
							{...stylex.attrs(dividerStyles.horizontal, styles.entryDivider)}
						></span>
					}
					fallback={<FieldArrayFallback />}
				>
					{(artist, idx) => (
						<MembershipListItem
							index={idx()}
							onRemove={removeMembershipAt(idx())}
							artist={artist}
						/>
					)}
				</Intersperse>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.lastDivider)}
				></span>
			</ul>
		</div>
	)
}

type MembershipListItemProps = {
	index: number
	onRemove: () => void
	artist: MembershipItem
}

function MembershipListItem(props: MembershipListItemProps) {
	const { formStore } = useArtistForm()
	return (
		<li {...stylex.attrs(styles.entry)}>
			<Field
				of={formStore}
				path={["data", "memberships", props.index, "artist_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? props.artist.id}
						/>
						<div {...stylex.attrs(styles.entryHeader)}>
							<div>{props.artist.name}</div>
							<Button
								onClick={props.onRemove}
								appearance="ghost"
								tone="gray"
								size="sm"
								styles={styles.removeButton}
							>
								<Cross1Icon />
							</Button>
						</div>
					</>
				)}
			</Field>

			<MembershipRoleField
				index={props.index}
				initialRoles={props.artist.roles}
			/>

			<TenureFieldArray index={props.index} />
		</li>
	)
}
