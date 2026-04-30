import { useLingui } from "@lingui/solid/macro"
import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import type { Accessor } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { Pagination } from "~/component/Pagination"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { RoleBadge } from "~/component/features/user/RoleBadge"
import { hasAdminRole } from "~/component/route"
import { setUserRoles } from "~/hey-api"
import type { EditableUserRole, PageResponseUserSummary } from "~/hey-api"
import {
	adminUsersOptions,
	adminUsersQueryKey,
	editableUserRolesOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout"
import { useCurrentUser } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"

const route = getRouteApi("/admin/users")

const DEFAULT_LIMIT = 20
const USERS_TABLE_GRID_CLASS =
	"grid grid-cols-[5rem_minmax(0,1fr)_18rem_8rem] gap-4"
const USERS_TABLE_ROW_CLASS = `${USERS_TABLE_GRID_CLASS} items-center px-4 py-3`
const USERS_TABLE_LIST_CLASS = "flex flex-col gap-1"
const ROLE_EDITOR_LIST_CLASS = "flex flex-col gap-2"
const ROLE_EDITOR_OPTION_BASE_CLASS =
	"flex w-full items-start gap-3 rounded-sm border px-3 py-3 text-left outline-1 outline-transparent -outline-offset-1 transition-colors duration-100 disabled:cursor-default disabled:opacity-70"
type AdminUserItem = PageResponseUserSummary["items"][number]

type AdminUsersSearch = {
	page: number
	limit: number
	keyword?: string
}

type AdminUsersSearchState = {
	page: number
	keyword?: string
	submit: () => void
	clear: () => void
	changePage: (page: number) => void
}

type AdminUsersListState = {
	users: AdminUserItem[]
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	totalPages: number
	totalItems: number
}

type AdminUsersRoleEditorDialogState = {
	user?: AdminUserItem
	open: boolean
	roleOptions: EditableUserRole[]
	roleOptionsError?: string
	selectedRoles: EditableUserRole[]
	isSaving: boolean
	saveError?: string
	onOpenChange: (open: boolean) => void
	onRolesChange: (roles: EditableUserRole[]) => void
	onSave: () => Promise<void>
}

type AdminUsersRoleEditor = {
	beginEdit: (user: AdminUserItem) => void
	dialog: AdminUsersRoleEditorDialogState
}

type RoleEditorDialogProps = {
	dialog: AdminUsersRoleEditorDialogState
}

type AdminUsersTableProps = {
	list: AdminUsersListState
	search: AdminUsersSearchState
	onEditRoles: (user: AdminUserItem) => void
}

type RoleEditorState = {
	editingUserId: number | undefined
	draftRoles: EditableUserRole[]
	saveError: string | undefined
	isSaving: boolean
}

const roleOptionsQueryOptions = editableUserRolesOptions({
	responseStyle: "fields",
})

function roleEditorOptionClass(selected: boolean) {
	return selected
		? `${ROLE_EDITOR_OPTION_BASE_CLASS} border-marisa-300 bg-marisa-50 focus-visible:outline-marisa-500`
		: `${ROLE_EDITOR_OPTION_BASE_CLASS} border-slate-200 bg-primary hover:bg-secondary focus-visible:outline-slate-400`
}

function toggleRoleSelection(
	selectedRoles: EditableUserRole[],
	role: EditableUserRole,
	checked: boolean,
) {
	const nextSelectedRoles = new Set(selectedRoles)

	if (checked) {
		nextSelectedRoles.add(role)
		return Array.from(nextSelectedRoles)
	}

	nextSelectedRoles.delete(role)
	return Array.from(nextSelectedRoles)
}

function useAdminUsersRoleEditor(users: Accessor<AdminUserItem[]>) {
	const { t } = useLingui()
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()

	const roleOptionsQuery = useQuery(() => roleOptionsQueryOptions)
	const roleOptions = createMemo(() => roleOptionsQuery.data?.data ?? [])

	const [roleEditorState, setRoleEditorState] = createStore<RoleEditorState>({
		editingUserId: undefined,
		draftRoles: [],
		saveError: undefined,
		isSaving: false,
	})

	const editingUser = createMemo(() =>
		users().find((user) => user.id === roleEditorState.editingUserId),
	)

	const reset = () => {
		setRoleEditorState(
			produce((draft) => {
				draft.editingUserId = undefined
				draft.draftRoles = []
				draft.saveError = undefined
			}),
		)
	}

	const beginEdit = (user: AdminUserItem) => {
		setRoleEditorState(
			produce((draft) => {
				draft.editingUserId = user.id
				draft.draftRoles = user.roles.flatMap((role) =>
					role.name === "Moderator" ? [role.name] : [],
				)
				draft.saveError = undefined
			}),
		)
	}

	const dialog: AdminUsersRoleEditorDialogState = {
		get user() {
			return editingUser()
		},
		get open() {
			return roleEditorState.editingUserId !== undefined
		},
		get roleOptions() {
			return roleOptions()
		},
		get roleOptionsError() {
			return roleOptionsQuery.isError
				? getErrorMessage(roleOptionsQuery.error, t`Unknown error`)
				: undefined
		},
		get selectedRoles() {
			return roleEditorState.draftRoles
		},
		get isSaving() {
			return roleEditorState.isSaving
		},
		get saveError() {
			return roleEditorState.saveError
		},
		onOpenChange: (open) => {
			if (!open && !roleEditorState.isSaving) {
				reset()
			}
		},
		onRolesChange: (roles) => {
			setRoleEditorState(
				produce((draft) => {
					draft.draftRoles = roles
					draft.saveError = undefined
				}),
			)
		},
		onSave: async () => {
			const user = editingUser()
			const selectedRoles = roleEditorState.draftRoles

			if (!user || roleEditorState.isSaving) {
				return
			}

			setRoleEditorState(
				produce((draft) => {
					draft.isSaving = true
					draft.saveError = undefined
				}),
			)

			try {
				await setUserRoles({
					path: { id: user.id },
					body: { roles: selectedRoles },
					throwOnError: true,
				})

				reset()

				await userCtx.flush()
				if (!userCtx.user || !hasAdminRole(userCtx.user.roles)) {
					return
				}

				void queryClient.invalidateQueries({
					queryKey: adminUsersQueryKey(),
				})
			} catch (error) {
				setRoleEditorState(
					produce((draft) => {
						draft.saveError = getErrorMessage(error, t`Unknown error`)
					}),
				)
			} finally {
				setRoleEditorState(
					produce((draft) => {
						draft.isSaving = false
					}),
				)
			}
		},
	}

	return {
		beginEdit,
		dialog,
	} satisfies AdminUsersRoleEditor
}

export function AdminUsersPage() {
	const { t } = useLingui()
	const search = route.useSearch()
	const navigate = useNavigate({ from: "/admin/users" })
	let keywordInputRef: HTMLInputElement | undefined

	const usersQuery = useQuery(() => {
		const currentSearch = search()
		return adminUsersOptions({
			query: {
				page: currentSearch.page,
				limit: currentSearch.limit,
				keyword: currentSearch.keyword,
			},
		})
	})
	const usersData = createMemo(() => usersQuery.data?.data)

	const navigateWithSearch = (nextSearch: Partial<AdminUsersSearch>) => {
		const currentSearch = search()
		void navigate({
			to: "/admin/users",
			search: {
				...currentSearch,
				...nextSearch,
			},
		})
	}

	const searchState: AdminUsersSearchState = {
		get page() {
			return search().page
		},
		get keyword() {
			return keywordInputRef?.value ?? search().keyword
		},
		submit: () => {
			const keyword = keywordInputRef?.value || undefined

			navigateWithSearch({
				page: 1,
				keyword,
			})
		},
		clear: () => {
			if (keywordInputRef) {
				keywordInputRef.value = ""
			}
			navigateWithSearch({
				page: 1,
				keyword: undefined,
			})
		},
		changePage: (page) => {
			navigateWithSearch({ page })
		},
	}

	const listState: AdminUsersListState = {
		get users() {
			return usersData()?.items ?? []
		},
		get isLoading() {
			return usersQuery.isLoading
		},
		get isError() {
			return usersQuery.isError
		},
		get errorMessage() {
			return usersQuery.isError
				? getErrorMessage(usersQuery.error, t`Unknown error`)
				: undefined
		},
		get totalPages() {
			return usersData()?.total_pages ?? 0
		},
		get totalItems() {
			return usersData()?.total_items ?? 0
		},
	}

	const roleEditor = useAdminUsersRoleEditor(() => usersData()?.items ?? [])

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<header class="flex flex-col flex-wrap items-start justify-between gap-2">
					<p class="text-sm text-tertiary">{t`Admin Settings`}</p>
					<h1 class="text-2xl font-light tracking-tight text-primary">
						{t`Users`}
					</h1>
					<p class="text-sm text-tertiary">
						View users and update system roles.
					</p>
				</header>

				<section class="flex flex-col gap-4">
					<form
						class="flex flex-wrap items-center gap-3"
						onSubmit={(event) => {
							event.preventDefault()
							searchState.submit()
						}}
					>
						<input
							ref={(value) => {
								keywordInputRef = value
								value.value = search().keyword ?? ""
							}}
							type="search"
							name="keyword"
							placeholder={t`Search by username`}
							class="min-w-72 flex-1 rounded-sm border border-slate-300 bg-primary px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-slate-400"
						/>
						<Button
							variant="SecondaryV2"
							size="Sm"
							color="Slate"
							type="button"
							onClick={searchState.submit}
						>
							Search
						</Button>
						<Button
							variant="Tertiary"
							size="Sm"
							color="Slate"
							type="button"
							disabled={!searchState.keyword}
							onClick={searchState.clear}
						>
							Clear
						</Button>
					</form>

					<AdminUsersTable
						list={listState}
						search={searchState}
						onEditRoles={roleEditor.beginEdit}
					/>
				</section>
			</div>

			<RoleEditorDialog dialog={roleEditor.dialog} />
		</PageLayout>
	)
}

function AdminUsersTable(props: AdminUsersTableProps) {
	const { t } = useLingui()
	return (
		<div class="flex flex-col gap-4">
			<div class="flex flex-col">
				<div
					class={`${USERS_TABLE_GRID_CLASS} px-4 py-3 text-sm font-medium text-tertiary`}
				>
					<div>{t`ID`}</div>
					<div>{t`User`}</div>
					<div>{t`Roles`}</div>
					<div class="text-right">{t`Action`}</div>
				</div>

				<Switch
					fallback={
						<div class={USERS_TABLE_LIST_CLASS}>
							<For each={props.list.users}>
								{(user) => (
									<AdminUsersRow
										user={user}
										onEditRoles={props.onEditRoles}
									/>
								)}
							</For>
						</div>
					}
				>
					<Match when={props.list.isLoading}>
						<div class={USERS_TABLE_LIST_CLASS}>
							<For each={Array.from({ length: DEFAULT_LIMIT })}>
								{() => <AdminUsersRowSkeleton />}
							</For>
						</div>
					</Match>

					<Match when={props.list.isError}>
						<div class="px-4 py-10 text-sm text-reimu-700">
							{props.list.errorMessage ?? t`Failed to load users.`}
						</div>
					</Match>

					<Match when={!props.list.isLoading && props.list.users.length === 0}>
						<div class="px-4 py-10">
							<div class="text-sm font-medium text-primary">
								{t`No users found`}
							</div>
							<div class="mt-1 text-sm text-tertiary">
								{t`No users match the current filters.`}
							</div>
						</div>
					</Match>
				</Switch>
			</div>

			<Show when={props.list.totalPages > 1}>
				<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
					<div class="text-sm text-tertiary">
						{t`Page ${props.search.page} of ${props.list.totalPages}`}
						<span class="mx-2 text-slate-300">•</span>
						{t`${props.list.totalItems} users`}
					</div>

					<Pagination
						current={props.search.page}
						total={props.list.totalPages}
						onPageChange={props.search.changePage}
					/>
				</div>
			</Show>
		</div>
	)
}

function AdminUsersRow(props: {
	user: AdminUserItem
	onEditRoles: (user: AdminUserItem) => void
}) {
	return (
		<div
			class={`${USERS_TABLE_ROW_CLASS} rounded-sm border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-secondary`}
		>
			<div class="font-mono text-sm text-tertiary">#{props.user.id}</div>
			<div class="min-w-0">
				<div class="truncate text-sm font-medium text-primary">
					{props.user.name}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<For each={props.user.roles}>
					{(role) => <RoleBadge role={role.name} />}
				</For>
			</div>
			<div class="flex justify-end">
				<Button
					variant="SecondaryV2"
					size="Sm"
					color="Slate"
					onClick={() => props.onEditRoles(props.user)}
				>
					Edit roles
				</Button>
			</div>
		</div>
	)
}

function RoleDescription(props: { role: EditableUserRole }) {
	const { t } = useLingui()

	const label = () =>
		({
			Moderator: t`Access moderation tools and review queues.`,
		})[props.role]

	return <>{label()}</>
}

function RoleEditorDialog(props: RoleEditorDialogProps) {
	const { t } = useLingui()
	const canSave = () => !props.dialog.isSaving && !props.dialog.roleOptionsError

	const preventDismiss = (event: Event) => {
		if (props.dialog.isSaving) {
			event.preventDefault()
		}
	}

	return (
		<Dialog.Root
			open={props.dialog.open}
			onOpenChange={props.dialog.onOpenChange}
		>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content
					class="w-[calc(100vw-2rem)] max-w-2xl rounded-sm border border-slate-300 p-5 shadow-lg"
					onPointerDownOutside={preventDismiss}
					onEscapeKeyDown={preventDismiss}
				>
					<div class="flex flex-col gap-5">
						<div class="space-y-2">
							<Dialog.Title class="text-xl font-medium text-primary">
								Edit roles
							</Dialog.Title>
							<Dialog.Description>
								<Show when={props.dialog.user}>
									{(user) => `Update roles for ${user().name}.`}
								</Show>
							</Dialog.Description>
						</div>

						<Switch
							fallback={
								<div class="rounded-sm border border-slate-200 bg-secondary px-4 py-3 text-sm text-tertiary">
									Loading role options…
								</div>
							}
						>
							<Match when={props.dialog.roleOptionsError}>
								<div class="rounded-sm border border-reimu-200 bg-reimu-50 px-4 py-3 text-sm text-reimu-700">
									{props.dialog.roleOptionsError}
								</div>
							</Match>

							<Match when>
								<div class={ROLE_EDITOR_LIST_CLASS}>
									<For each={props.dialog.roleOptions}>
										{(role) => {
											const selected = () =>
												props.dialog.selectedRoles.includes(role)

											return (
												<label class={roleEditorOptionClass(selected())}>
													<input
														type="checkbox"
														class="mt-0.5 size-4 shrink-0 rounded-sm border-slate-300 accent-marisa-700"
														checked={selected()}
														disabled={props.dialog.isSaving}
														onChange={(event) => {
															props.dialog.onRolesChange(
																toggleRoleSelection(
																	props.dialog.selectedRoles,
																	role,
																	event.currentTarget.checked,
																),
															)
														}}
													/>
													<div class="min-w-0">
														<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
															<RoleBadge role={role} />
															<div class="min-w-0 text-sm text-tertiary">
																<RoleDescription role={role} />
															</div>
														</div>
													</div>
												</label>
											)
										}}
									</For>
								</div>
							</Match>
						</Switch>

						<Show when={props.dialog.saveError}>
							<div class="rounded-sm border border-reimu-200 bg-reimu-50 px-4 py-3 text-sm text-reimu-700">
								{props.dialog.saveError}
							</div>
						</Show>

						<div class="flex justify-end gap-3">
							<Dialog.CloseButton
								variant="Tertiary"
								color="Slate"
								class="px-2 py-1"
								disabled={props.dialog.isSaving}
							>
								Cancel
							</Dialog.CloseButton>
							<Button
								variant="Primary"
								color="Reimu"
								class="px-2 py-1"
								disabled={!canSave()}
								onClick={() => {
									void props.dialog.onSave()
								}}
							>
								<Show
									when={props.dialog.isSaving}
									fallback={t`Save roles`}
								>
									Saving…
								</Show>
							</Button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function AdminUsersRowSkeleton() {
	return (
		<div
			class={`${USERS_TABLE_ROW_CLASS} animate-pulse rounded-sm border border-slate-200 bg-white`}
		>
			<div class="h-4 w-12 rounded bg-slate-200"></div>
			<div class="h-4 w-40 rounded bg-slate-200"></div>
			<div class="flex gap-2">
				<div class="h-6 w-20 rounded-full bg-slate-100"></div>
				<div class="h-6 w-24 rounded-full bg-slate-100"></div>
			</div>
			<div class="flex justify-end">
				<div class="h-8 w-24 rounded bg-slate-200"></div>
			</div>
		</div>
	)
}
