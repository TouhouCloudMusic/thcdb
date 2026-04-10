// @refresh-reload
import { Field, insert, remove } from "@formisch/solid"
import { useQuery } from "@tanstack/solid-query"
import type { CreditRoleSummary } from "@thc/api"
import { CreditRoleQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal, For, Suspense } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { CheckIcon, Cross1Icon } from "solid-radix-icons"

import { Combobox } from "~/component/atomic/Combobox"

import { useArtistForm } from "../../context"

export function MembershipRoleField(props: { index: number }): JSX.Element {
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

	const [roles, setRoles] = createStore<CreditRoleSummary[]>([])

	const rolesQuery = useQuery(() => ({
		...CreditRoleQueryOption.findByKeyword(searchTermTrimmed()!),
		placeholderData: id,
		enabled: Boolean(searchTermTrimmed()?.length),
	}))

	const options = createMemo(() => {
		const data = rolesQuery.data ?? []

		return data.filter((role) => !roles.some((x) => x.id === role.id))
	})

	const addRole = (role: CreditRoleSummary) => {
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
		<div class="row-start-2">
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
						<Combobox.MultiInputContainer class="flex flex-row flex-wrap gap-1 p-1">
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
								placeholder="Search roles..."
								value={searchTerm()}
								aria-label="Search credit role"
								class="flex-1 pl-1"
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
	role: CreditRoleSummary
	removeRole: () => void
}) {
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
				<li class="flex items-center space-x-1 rounded border border-slate-300 px-2 py-1 hover:border-reimu-600">
					<input
						{...field.props}
						type="number"
						hidden
						value={field.input ?? props.role.id}
					/>
					<span>{props.role.name}</span>
					<button
						type="button"
						class="text-slate-600"
						aria-label="Remove role"
						title="Remove role"
						onClick={() => props.removeRole()}
					>
						<Cross1Icon class="size-4" />
					</button>
				</li>
			)}
		</Field>
	)
}
