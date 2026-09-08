// @refresh-reload
import { Field, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import type { CreditRoleRef } from "@thc/api"
import { CheckIcon, Cross1Icon } from "@thc/icons/radix"
import { CreditRoleQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal, For, Suspense, untrack } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { Combobox } from "~/component/atomic/Combobox"
import { palette } from "~/style/color/palette.stylex"
import { radius, px } from "~/style/tokens.stylex"

import { useArtistForm } from "../../context"

const styles = stylex.create({
	nameField: {
		gridRowStart: "2",
	},
	roleInput: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: px[4],
		padding: px[4],
	},
	searchInput: {
		flex: "1",
		paddingLeft: px[4],
	},
	role: {
		display: "flex",
		alignItems: "center",
		borderRadius: radius.sm,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: {
			default: palette.slate[300],
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
		},
		paddingInline: px[8],
		paddingBlock: px[4],
	},
	roleName: { marginInlineStart: 0, marginInlineEnd: px[4] },
	removeIcon: {
		color: palette.slate[600],
	},
	icon: {
		width: px[16],
		height: px[16],
	},
})

export function MembershipRoleField(props: {
	index: number
	initialRoles?: CreditRoleRef[]
}): JSX.Element {
	const { t } = useLingui()
	const SEARCH_DEBOUNCE_MS = 300
	const { formStore } = useArtistForm()

	const [searchTerm, setSearchTerm] = createSignal("")

	const searchTermTrimmed = createMemo(() => {
		const kw = searchTerm().trim()
		return kw.length > 1 ? kw : undefined
	})

	const setSearchTermDebounced = debounce(SEARCH_DEBOUNCE_MS, (val: string) =>
		setSearchTerm(val),
	)

	const [roles, setRoles] = createStore<CreditRoleRef[]>(
		untrack(() => [...(props.initialRoles ?? [])]),
	)

	const rolesQuery = useQuery(() => ({
		...CreditRoleQueryOption.findByKeyword(searchTermTrimmed()!),
		placeholderData: id,
		enabled: Boolean(searchTermTrimmed()?.length),
	}))

	const options = createMemo(() => {
		const data = rolesQuery.data ?? []

		return data.filter((role) => !roles.some((x) => x.id === role.id))
	})

	const addRole = (role: CreditRoleRef) => {
		setRoles(
			produce((prev) => {
				prev.push(role)
			}),
		)

		insert(formStore, {
			path: ["data", "memberships", props.index, "roles"],
			initialInput: role.id,
		})
	}

	const removeRole = (index: number) => {
		setRoles(
			produce((s) => {
				s.splice(index, 1)
			}),
		)
		remove(formStore, {
			path: ["data", "memberships", props.index, "roles"],
			at: index,
		})
	}

	return (
		<div {...stylex.attrs(styles.nameField)}>
			<Suspense>
				<Combobox.Root
					options={options()}
					optionValue="id"
					optionTextValue="name"
					open={Boolean(options().length)}
					onChange={(role) => {
						if (role) {
							addRole(role)
						}
					}}
					itemComponent={(itemProps) => (
						<Combobox.Item item={itemProps.item}>
							<Combobox.ItemLabel>
								{itemProps.item.rawValue.name}
							</Combobox.ItemLabel>
							<Combobox.ItemIndicator>
								<CheckIcon />
							</Combobox.ItemIndicator>
						</Combobox.Item>
					)}
				>
					<Combobox.Control>
						<Combobox.MultiInputContainer styles={[styles.roleInput]}>
							<For each={roles}>
								{(role, index) => (
									<RoleBadge
										membershipIndex={props.index}
										role={role}
										index={index()}
										removeRole={() => removeRole(index())}
									/>
								)}
							</For>
							<Combobox.MultiInput
								placeholder={t`Search roles...`}
								value={searchTerm()}
								aria-label={t`Search credit role`}
								styles={[styles.searchInput]}
								onInput={(e) => setSearchTermDebounced(e.currentTarget.value)}
							/>
						</Combobox.MultiInputContainer>
					</Combobox.Control>

					<Combobox.Portal>
						<Combobox.Content>
							<Combobox.Listbox />
						</Combobox.Content>
					</Combobox.Portal>
				</Combobox.Root>
			</Suspense>
		</div>
	)
}

function RoleBadge(props: {
	membershipIndex: number
	index: number
	role: CreditRoleRef
	removeRole: () => void
}) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()
	return (
		<Field
			of={formStore}
			path={[
				"data",
				"memberships",
				props.membershipIndex,
				"roles",
				props.index,
			]}
		>
			{(field) => (
				<li {...stylex.attrs(styles.role)}>
					<input
						{...field.props}
						type="number"
						hidden
						value={field.input ?? props.role.id}
					/>
					<span {...stylex.attrs(styles.roleName)}>{props.role.name}</span>
					<button
						type="button"
						{...stylex.attrs(styles.removeIcon)}
						aria-label={t`Remove role`}
						title={t`Remove role`}
						onClick={() => props.removeRole()}
					>
						<Cross1Icon {...stylex.attrs(styles.icon)} />
					</button>
				</li>
			)}
		</Field>
	)
}
