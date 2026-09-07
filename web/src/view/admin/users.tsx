import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import type { Accessor } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { Pagination } from "~/component/Pagination"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { RoleBadge } from "~/component/features/user/RoleBadge"
import { hasAdminRole } from "~/domain/user/authorization"
import { setUserRoles } from "~/hey-api"
import type { EditableUserRole, PageResponseUserSummary } from "~/hey-api"
import {
	adminUsersOptions,
	adminUsersQueryKey,
	editableUserRolesOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout"
import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { getErrorMessage } from "~/utils/getErrorMessage"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	dialogTitle: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	roleOption: {
		display: "flex",
		width: "100%",
		alignItems: "flex-start",
		gap: px[12],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		paddingInline: px[12],
		paddingBlock: px[12],
		textAlign: "left",
		outlineWidth: "1px",
		outlineStyle: "solid",
		outlineOffset: "-1px",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "100ms",
		cursor: { default: null, ":disabled": "default" },
		opacity: { default: null, ":disabled": 0.7 },
	},
	selectedRole: {
		borderColor: palette.marisa[300],
		outlineColor: {
			default: "transparent",
			":focus-visible": palette.marisa[500],
		},
	},
	unselectedRole: {
		borderColor: palette.slate[200],
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": colors.backgroundSecondary,
			},
		},
		outlineColor: {
			default: "transparent",
			":focus-visible": palette.slate[400],
		},
	},
	page: { padding: px[32] },
	content: { display: "flex", flexDirection: "column", gap: px[24] },
	header: {
		display: "flex",
		flexDirection: "column",
		flexWrap: "wrap",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: px[8],
	},
	muted: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	section: { display: "flex", flexDirection: "column", gap: px[16] },
	filters: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[12],
	},
	searchInput: {
		minWidth: px[288],
		flex: "1",
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: { default: palette.slate[300], ":focus": palette.slate[400] },
		backgroundColor: colors.backgroundPrimary,
		paddingInline: px[12],
		paddingBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textPrimary,
		outlineStyle: "none",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	table: { display: "flex", flexDirection: "column" },
	tableHeader: {
		display: "grid",
		gridTemplateColumns: "5rem minmax(0,1fr) 18rem 8rem",
		gap: px[16],
		paddingInline: px[16],
		paddingBlock: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textTertiary,
	},
	actionHeading: { textAlign: "right" },
	userList: { display: "flex", flexDirection: "column", gap: px[4] },
	error: {
		paddingInline: px[16],
		paddingBlock: px[40],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[700],
	},
	emptyState: { paddingInline: px[16], paddingBlock: px[40] },
	emptyTitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	emptyDescription: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	pagination: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
		paddingInline: px[16],
		paddingBlock: px[16],
	},
	separator: { marginInline: px[8], color: palette.slate[300] },
	userRow: {
		display: "grid",
		gridTemplateColumns: "5rem minmax(0,1fr) 18rem 8rem",
		gap: px[16],
		alignItems: "center",
		paddingInline: px[16],
		paddingBlock: px[12],
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: {
			default: palette.slate[200],
			":hover": { default: null, "@media (hover: hover)": palette.slate[300] },
		},
		backgroundColor: {
			default: palette.white,
			":hover": {
				default: null,
				"@media (hover: hover)": colors.backgroundSecondary,
			},
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	userId: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	userIdentity: { minWidth: "0rem" },
	userName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	roles: { display: "flex", flexWrap: "wrap", gap: px[8] },
	editAction: { display: "flex", justifyContent: "flex-end" },
	dialog: {
		width: "calc(100vw - 2rem)",
		maxWidth: px[672],
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		padding: px[20],
		boxShadow:
			"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
	},
	dialogBody: { display: "flex", flexDirection: "column", gap: px[20] },
	loadingNotice: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundSecondary,
		paddingInline: px[16],
		paddingBlock: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	errorNotice: {
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.reimu[200],
		paddingInline: px[16],
		paddingBlock: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[700],
	},
	roleOptions: { display: "flex", flexDirection: "column", gap: px[8] },
	checkbox: {
		marginTop: px[2],
		width: px[16],
		height: px[16],
		flexShrink: 0,
		borderRadius: radius.sm,
		borderColor: palette.slate[300],
		accentColor: palette.marisa[700],
	},
	roleHeading: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: px[8],
		rowGap: px[4],
	},
	roleDescription: {
		minWidth: "0rem",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	dialogActions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: px[12],
	},
	dialogButton: { paddingInline: px[8], paddingBlock: px[4] },
	skeletonRow: {
		display: "grid",
		gridTemplateColumns: "5rem minmax(0,1fr) 18rem 8rem",
		gap: px[16],
		alignItems: "center",
		paddingInline: px[16],
		paddingBlock: px[12],
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[200],
		backgroundColor: palette.white,
	},
	skeletonId: {
		height: px[16],
		width: px[48],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonName: {
		height: px[16],
		width: px[160],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonRoles: { display: "flex", gap: px[8] },
	skeletonRole: {
		height: px[24],
		width: px[80],
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
	},
	skeletonRoleWide: {
		height: px[24],
		width: px[96],
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
	},
	skeletonAction: {
		height: px[32],
		width: px[96],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	dialogHeaderChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
})

const route = getRouteApi("/admin/users")

const DEFAULT_LIMIT = 20
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

				if (user.name === userCtx.profile?.name) {
					await userCtx.refreshAuthorization()
				}

				if (!hasAdminRole(userCtx.authorization)) {
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
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<header {...stylex.attrs(styles.header)}>
					<p {...stylex.attrs(styles.muted)}>{t`Admin Settings`}</p>
					<h1 {...stylex.attrs(styles.title)}>{t`Users`}</h1>
					<p {...stylex.attrs(styles.muted)}>
						View users and update system roles.
					</p>
				</header>

				<section {...stylex.attrs(styles.section)}>
					<form
						{...stylex.attrs(styles.filters)}
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
							aria-label={t`Search by username`}
							name="keyword"
							placeholder={t`Search by username`}
							{...stylex.attrs(styles.searchInput)}
						/>
						<Button
							appearance="outline"
							tone="slate"
							size="sm"
							type="button"
							onClick={searchState.submit}
						>
							Search
						</Button>
						<Button
							appearance="ghost"
							tone="slate"
							size="sm"
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
		<div {...stylex.attrs(styles.section)}>
			<div {...stylex.attrs(styles.table)}>
				<div {...stylex.attrs(styles.tableHeader)}>
					<div>{t`ID`}</div>
					<div>{t`User`}</div>
					<div>{t`Roles`}</div>
					<div {...stylex.attrs(styles.actionHeading)}>{t`Action`}</div>
				</div>

				<Switch
					fallback={
						<div {...stylex.attrs(styles.userList)}>
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
						<div {...stylex.attrs(styles.userList)}>
							<For each={Array.from({ length: DEFAULT_LIMIT })}>
								{() => <AdminUsersRowSkeleton />}
							</For>
						</div>
					</Match>

					<Match when={props.list.isError}>
						<div {...stylex.attrs(styles.error)}>
							{props.list.errorMessage ?? t`Failed to load users.`}
						</div>
					</Match>

					<Match when={!props.list.isLoading && props.list.users.length === 0}>
						<div {...stylex.attrs(styles.emptyState)}>
							<div {...stylex.attrs(styles.emptyTitle)}>
								{t`No users found`}
							</div>
							<div {...stylex.attrs(styles.emptyDescription)}>
								{t`No users match the current filters.`}
							</div>
						</div>
					</Match>
				</Switch>
			</div>

			<Show when={props.list.totalPages > 1}>
				<div {...stylex.attrs(styles.pagination)}>
					<div {...stylex.attrs(styles.muted)}>
						{t`Page ${props.search.page} of ${props.list.totalPages}`}
						<span {...stylex.attrs(styles.separator)}>•</span>
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
		<div {...stylex.attrs(styles.userRow)}>
			<div {...stylex.attrs(styles.userId)}>#{props.user.id}</div>
			<div {...stylex.attrs(styles.userIdentity)}>
				<div {...stylex.attrs(styles.userName)}>{props.user.name}</div>
			</div>
			<div {...stylex.attrs(styles.roles)}>
				<For each={props.user.roles}>
					{(role) => <RoleBadge role={role.name} />}
				</For>
			</div>
			<div {...stylex.attrs(styles.editAction)}>
				<Button
					appearance="outline"
					tone="slate"
					size="sm"
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
					styles={styles.dialog}
					onPointerDownOutside={preventDismiss}
					onEscapeKeyDown={preventDismiss}
				>
					<div {...stylex.attrs(styles.dialogBody)}>
						<div>
							<Dialog.Title
								styles={[styles.dialogTitle, styles.dialogHeaderChild]}
							>
								Edit roles
							</Dialog.Title>
							<Dialog.Description styles={styles.dialogHeaderChild}>
								<Show when={props.dialog.user}>
									{(user) => `Update roles for ${user().name}.`}
								</Show>
							</Dialog.Description>
						</div>

						<Switch
							fallback={
								<div {...stylex.attrs(styles.loadingNotice)}>
									Loading role options…
								</div>
							}
						>
							<Match when={props.dialog.roleOptionsError}>
								<div {...stylex.attrs(styles.errorNotice)}>
									{props.dialog.roleOptionsError}
								</div>
							</Match>

							<Match when>
								<div {...stylex.attrs(styles.roleOptions)}>
									<For each={props.dialog.roleOptions}>
										{(role) => {
											const selected = () =>
												props.dialog.selectedRoles.includes(role)

											return (
												<label
													{...stylex.attrs(
														styles.roleOption,
														selected()
															? styles.selectedRole
															: styles.unselectedRole,
													)}
												>
													<input
														type="checkbox"
														aria-label={role}
														{...stylex.attrs(styles.checkbox)}
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
													<div {...stylex.attrs(styles.userIdentity)}>
														<div {...stylex.attrs(styles.roleHeading)}>
															<RoleBadge role={role} />
															<div {...stylex.attrs(styles.roleDescription)}>
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
							<div {...stylex.attrs(styles.errorNotice)}>
								{props.dialog.saveError}
							</div>
						</Show>

						<div {...stylex.attrs(styles.dialogActions)}>
							<Dialog.CloseButton
								as={Button}
								appearance="ghost"
								tone="slate"
								styles={styles.dialogButton}
								disabled={props.dialog.isSaving}
							>
								Cancel
							</Dialog.CloseButton>
							<Button
								appearance="solid"
								tone="reimu"
								styles={styles.dialogButton}
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
		<div {...stylex.attrs(animationStyles.pulse, styles.skeletonRow)}>
			<div {...stylex.attrs(styles.skeletonId)}></div>
			<div {...stylex.attrs(styles.skeletonName)}></div>
			<div {...stylex.attrs(styles.skeletonRoles)}>
				<div {...stylex.attrs(styles.skeletonRole)}></div>
				<div {...stylex.attrs(styles.skeletonRoleWide)}></div>
			</div>
			<div {...stylex.attrs(styles.editAction)}>
				<div {...stylex.attrs(styles.skeletonAction)}></div>
			</div>
		</div>
	)
}
