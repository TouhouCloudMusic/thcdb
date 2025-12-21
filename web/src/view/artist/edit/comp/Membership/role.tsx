// @refresh-reload
// oxlint-disable max-lines-per-function
import { useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"
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
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	let [searchTerm, setSearchTerm] = createSignal("")

	let searchTermTrimmed = createMemo(() => {
		const kw = searchTerm().trim()
		return kw.length > 1 ? kw : undefined
	})

	let setSearchTermDebounced = debounce(SEARCH_DEBOUNCE_MS, (val: string) =>
		setSearchTerm(val),
	)

	let [roles, setRoles] = createStore<CreditRoleSummary[]>([])

	let rolesQuery = useQuery(() => ({
		...CreditRoleQueryOption.findByKeyword(searchTermTrimmed()!),
		placeholderData: id,
		enabled: Boolean(searchTermTrimmed()?.length),
	}))

	let options = createMemo(() => {
		let data = rolesQuery.data ?? []

		return data.filter((role) => !roles.some((x) => x.id === role.id))
	})

	let path = () => `data.memberships.${props.index}.roles` as const

	let addRole = (role: CreditRoleSummary) => {
		setRoles(
			produce((roles) => {
				roles.push(role)
			}),
		)
		M.insert(formStore, path(), {
			value: role.id,
		})
	}

	let removeRole = (index: number) => {
		setRoles(
			produce((s) => {
				s.splice(index, 1)
			}),
		)
		M.remove(formStore, path(), {
			at: index,
		})
	}

	return (
		<div class="row-start-2">
			{/* <div class="text-primary">
				<Trans>Roles</Trans>
			</div> */}
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
					itemComponent={(props) => (
						<Combobox.Item item={props.item}>
							<Combobox.ItemLabel>
								{props.item.rawValue.name}
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
										role={role}
										index={index()}
										path={path()}
										removeRole={() => removeRole(index())}
									/>
								)}
							</For>
							<Combobox.MultiInput
								placeholder={t`Search roles...`}
								value={searchTerm()}
								aria-label={t`Search credit role`}
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
	path: `data.memberships.${number}.roles`
	index: number
	role: CreditRoleSummary
	removeRole: () => void
}) {
	const { t } = useLingui()

	let { formStore } = useArtistForm()
	return (
		<M.Field
			of={formStore}
			name={`${props.path}.${props.index}`}
		>
			{(field, fieldProps) => (
				<li class="flex items-center space-x-1 rounded border border-slate-300 px-2 py-1 hover:border-reimu-600">
					<input
						{...fieldProps}
						type="number"
						hidden
						value={field.value}
					/>
					<span>{props.role.name}</span>
					<button
						type="button"
						class="text-slate-600"
						aria-label={t`Remove role`}
						title={t`Remove role`}
						onClick={() => props.removeRole()}
					>
						<Cross1Icon class="size-4" />
					</button>
				</li>
			)}
		</M.Field>
	)
}
