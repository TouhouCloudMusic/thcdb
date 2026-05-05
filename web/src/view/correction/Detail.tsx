import { Trans, useLingui } from "@lingui/solid/macro"
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import { CorrectionMutation, CorrectionQueryOption } from "@thc/query"
import { ArrExt } from "@thc/toolkit/data"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { twMerge } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { INPUT_LIKE_BASE_CLASS } from "~/component/atomic/Input"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button, ButtonClass_new } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import { showSuccessToast } from "~/component/toast"
import { USER_ROLE_NAMES } from "~/domain/user/constants"
import type {
	CorrectionComment,
	CorrectionDetail,
	CorrectionDiffEntry,
	EntityType,
	HandleCorrectionMethod,
} from "~/hey-api"
import { handleCorrection } from "~/hey-api"
import {
	findCommentsInfiniteOptions,
	findCommentsInfiniteQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { useCurrentUser } from "~/state/user"
import { formatTimestamp } from "~/utils/dateTime"
import { getErrorMessage } from "~/utils/getErrorMessage"

import { CorrectionComments } from "./CorrectionComments"
import {
	ENTITY_EDIT_ROUTE_MAP,
	ENTITY_HISTORY_MAP,
	ENTITY_ROUTE_MAP,
} from "./entityMap"
import { invalidatePendingCorrection } from "./pendingCorrection"

const DETAIL_LABEL_CLASS = "text-sm text-tertiary"

type CorrectionHeaderProps = {
	correction: CorrectionDetail
	actions?: JSX.Element
}

function CorrectionHeader(props: CorrectionHeaderProps) {
	const { t } = useLingui()
	const entityRoute = () => ENTITY_ROUTE_MAP[props.correction.entity_type]
	const entityLabel = () =>
		(
			({
				Artist: t`Artist`,
				Label: t`Label`,
				Release: t`Release`,
				Song: t`Song`,
				Tag: t`Tag`,
				Event: t`Event`,
				SongLyrics: t`Song lyrics`,
				CreditRole: t`Credit role`,
			}) satisfies Record<EntityType, string>
		)[props.correction.entity_type]
	const entityTypeText = () => entityLabel().toLowerCase()

	return (
		<header class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<h1 class="text-2xl font-light tracking-tight text-primary">
					<Trans>
						Correction of {entityTypeText()}{" "}
						<Link
							to={entityRoute()}
							params={{ id: props.correction.entity_id.toString() }}
						>
							{props.correction.entity_name}
						</Link>
					</Trans>
				</h1>
				{props.actions}
			</div>

			<div class="flex flex-wrap gap-x-12 gap-y-3 text-sm text-secondary">
				<div class="space-y-1">
					<div class={DETAIL_LABEL_CLASS}>{t`Type`}</div>
					<span>{props.correction.type}</span>
				</div>
				<div class="space-y-1">
					<div class={DETAIL_LABEL_CLASS}>{t`Author`}</div>
					<Link
						to="/profile/$username"
						params={{ username: props.correction.author.name }}
						class="inline-flex items-center gap-2 text-secondary"
					>
						<Avatar
							user={props.correction.author}
							class="size-5"
						/>
						<span>{props.correction.author.name}</span>
					</Link>
				</div>
				<div class="space-y-1">
					<div class={DETAIL_LABEL_CLASS}>{t`Created`}</div>
					<span>{formatTimestamp(props.correction.created_at, t`None`)}</span>
				</div>
				<div class="space-y-1">
					<div class={DETAIL_LABEL_CLASS}>{t`Status`}</div>
					<span>{props.correction.status}</span>
				</div>
			</div>
		</header>
	)
}

const DIFF_TONE = {
	before: "bg-reimu-100 border-reimu-200",
	after: "bg-green-100 border-green-200",
}

type DiffValueProps = {
	label: string
	value?: string | null
	variant: "before" | "after"
}

function DiffValue(props: DiffValueProps) {
	return (
		<div class="space-y-1">
			<div class="text-xs font-medium tracking-wide text-tertiary md:hidden">
				{props.label}
			</div>
			<pre
				class={twMerge(
					"m-0 max-h-64 overflow-auto rounded-md border px-3 py-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-slate-800",
					DIFF_TONE[props.variant],
				)}
			>
				{props.value ?? "None"}
			</pre>
		</div>
	)
}

type DiffEntriesProps = {
	changes?: CorrectionDiffEntry[]
	isLoading: boolean
}

function DiffEntries(props: DiffEntriesProps) {
	const { t } = useLingui()
	const entries = () => props.changes ?? []

	return (
		<Switch>
			<Match when={props.isLoading}>
				<div class="px-4 py-3 text-sm text-tertiary">{t`Loading diff...`}</div>
			</Match>
			<Match when={entries().length === 0}>
				<div class="px-4 py-3 text-sm text-tertiary">
					{t`No changes detected.`}
				</div>
			</Match>
			<Match when={true}>
				<div>
					<div class="hidden border-b border-slate-200 md:grid md:grid-cols-[12rem_1fr_1fr] md:gap-3 md:px-4 md:py-2">
						<div class="text-xs font-medium tracking-wide text-tertiary">
							{t`Field`}
						</div>
						<div class="text-xs font-medium tracking-wide text-tertiary">
							{t`Before`}
						</div>
						<div class="text-xs font-medium tracking-wide text-tertiary">
							{t`After`}
						</div>
					</div>
					<ul class="divide-y divide-slate-200">
						<For each={entries()}>
							{(entry) => (
								<li class="grid gap-3 px-4 py-3 md:grid-cols-[12rem_1fr_1fr] md:items-start">
									<div class="min-w-0">
										<div
											class="truncate font-mono text-xs text-secondary"
											title={entry.path}
										>
											{entry.path}
										</div>
									</div>
									<DiffValue
										label={t`Before`}
										value={entry.before}
										variant="before"
									/>
									<DiffValue
										label={t`After`}
										value={entry.after}
										variant="after"
									/>
								</li>
							)}
						</For>
					</ul>
				</div>
			</Match>
		</Switch>
	)
}

const SECTION_CARD_CLASS =
	"overflow-hidden border border-slate-300 p-0 shadow-xs"
const SECTION_HEADER_CLASS =
	"bg-slate-50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-4 py-3"
const DIFF_HEADER_TITLE_CLASS = "text-sm text-tertiary"
const COMPARE_BASELINE_VALUE = "__baseline__"

type ConfirmActionButtonProps = {
	title: string
	description: string
	confirmText: string
	color: "Green" | "Reimu"
	variant: "Primary" | "Secondary"
	disabled: boolean
	onConfirm: () => void
	children: string
}

function ConfirmActionButton(props: ConfirmActionButtonProps) {
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)

	const confirm = () => {
		setOpen(false)
		props.onConfirm()
	}

	return (
		<AlertDialog
			open={open()}
			onOpenChange={setOpen}
			triggerAs={(triggerProps) => (
				<Button
					{...triggerProps}
					variant={props.variant}
					color={props.color}
					size="Sm"
					disabled={props.disabled}
				>
					{props.children}
				</Button>
			)}
			title={props.title}
			description={props.description}
			confirmText={props.confirmText}
			cancelText={t`Cancel`}
			onCancel={() => setOpen(false)}
			onConfirm={confirm}
		/>
	)
}

type CorrectionActionsProps = {
	canManage: boolean
	canEdit: boolean
	correction: CorrectionDetail
	isBusy: boolean
	errorMessage?: string
	onApprove: () => void
	onReject: () => void
}

function CorrectionActions(props: CorrectionActionsProps) {
	const { t } = useLingui()
	const isPending = () => props.correction.status === "Pending"
	const editRoute = () => {
		if (!props.canEdit || !isPending()) return
		return ENTITY_EDIT_ROUTE_MAP[props.correction.entity_type]
	}

	return (
		<Show when={isPending()}>
			<div class="flex flex-col items-end gap-2">
				<div class="flex flex-wrap justify-end gap-2">
					<Show when={editRoute()}>
						{(route) => (
							<Link
								to={route()}
								params={{ id: props.correction.entity_id.toString() }}
								search={{ correctionId: props.correction.id }}
								underline={false}
								class={ButtonClass_new({ variant: "Secondary", size: "Sm" })}
							>
								{t`Edit`}
							</Link>
						)}
					</Show>
					<Show when={props.canManage}>
						<ConfirmActionButton
							title={t`Approve correction?`}
							description={t({
								message: "This will apply the correction to the target entity.",
							})}
							confirmText={t`Approve`}
							color="Green"
							variant="Primary"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onApprove}
						>
							{t`Approve`}
						</ConfirmActionButton>
						<ConfirmActionButton
							title={t`Reject correction?`}
							description={t({
								message: "This will mark the correction as rejected.",
							})}
							confirmText={t`Reject`}
							color="Reimu"
							variant="Secondary"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onReject}
						>
							{t`Reject`}
						</ConfirmActionButton>
					</Show>
				</div>
				<Show when={props.errorMessage}>
					{(message) => <div class="text-xs text-reimu-700">{message()}</div>}
				</Show>
			</div>
		</Show>
	)
}

type CorrectionDetailPageProps = {
	correctionId: number
	compareId?: number | null
	onCompareIdChange: (value: number | undefined) => void
}

export function CorrectionDetailPage(props: CorrectionDetailPageProps) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const queryClient = useQueryClient()
	const correctionQuery = useQuery(() =>
		CorrectionQueryOption.detail(props.correctionId),
	)

	const createCommentMutation = CorrectionMutation.useCreateCommentMutation()
	const deleteCommentMutation = CorrectionMutation.useDeleteCommentMutation()
	const handleCorrectionMutation = useMutation(() => ({
		mutationFn: (method: HandleCorrectionMethod) =>
			handleCorrection({
				path: { id: props.correctionId },
				query: { method },
				throwOnError: true,
			}),
	}))

	const initialCommentsNextCursor = createMemo(
		() => correctionQuery.data?.comments.next_cursor,
	)
	const commentPagesQuery = useInfiniteQuery(() => {
		const initialCursor = initialCommentsNextCursor()
		return {
			...findCommentsInfiniteOptions({
				path: { id: props.correctionId },
			}),
			initialPageParam: initialCursor ?? 0,
			getNextPageParam: (last) => last.data.next_cursor ?? undefined,
			enabled: false,
		}
	})
	const [createdCommentsByCorrectionId, setCreatedCommentsByCorrectionId] =
		createStore<Record<number, CorrectionComment[]>>({})
	const createdComments = () =>
		createdCommentsByCorrectionId[props.correctionId] ?? []
	const addCreatedComment = (comment: CorrectionComment) => {
		setCreatedCommentsByCorrectionId(
			produce((state) => {
				const comments = state[props.correctionId] ?? []
				state[props.correctionId] = ArrExt.dedupeByKey(
					[...comments, comment],
					"id",
				)
			}),
		)
	}
	const removeCreatedComment = (commentId: number) => {
		setCreatedCommentsByCorrectionId(
			produce((state) => {
				const comments = state[props.correctionId] ?? []
				state[props.correctionId] = comments.filter(
					(comment) => comment.id !== commentId,
				)
			}),
		)
	}

	const canManage = () =>
		userCtx.user?.roles?.some(
			(r) =>
				r.name === USER_ROLE_NAMES.Admin
				|| r.name === USER_ROLE_NAMES.Moderator,
		) ?? false
	const canEdit = () =>
		canManage() || userCtx.user?.name === correctionQuery.data?.author.name

	const allComments = createMemo(() => {
		const commentPages = commentPagesQuery.isSuccess
			? commentPagesQuery.data.pages.flatMap((page) => page.data.items)
			: []
		const comments = ArrExt.dedupeByKey(
			[
				...(correctionQuery.data?.comments.items ?? []),
				...commentPages,
				...createdComments(),
			],
			"id",
		)
		return comments
	})
	const hasFetchedCommentPages = createMemo(
		() =>
			commentPagesQuery.isSuccess && commentPagesQuery.data.pages.length > 0,
	)
	const hasMoreComments = createMemo(() => {
		if (!hasFetchedCommentPages()) {
			return initialCommentsNextCursor() != null
		}
		return commentPagesQuery.hasNextPage
	})

	const loadMore = async () => {
		if (!hasMoreComments() || commentPagesQuery.isFetchingNextPage) {
			return
		}
		await commentPagesQuery.fetchNextPage()
	}

	const invalidateCommentQueries = async () => {
		await queryClient.invalidateQueries({
			queryKey: ["correction::detail", props.correctionId],
		})
		await queryClient.invalidateQueries({
			queryKey: findCommentsInfiniteQueryKey({
				path: { id: props.correctionId },
			}),
		})
	}

	const onCreateComment = async (content: string, parentId: number | null) => {
		const comment = await createCommentMutation.mutateAsync({
			correctionId: props.correctionId,
			content,
			parentId,
		})
		addCreatedComment(comment)
		await invalidateCommentQueries()
	}

	const onDeleteComment = async (commentId: number) => {
		await deleteCommentMutation.mutateAsync(commentId)
		removeCreatedComment(commentId)
		await invalidateCommentQueries()
	}

	const activeCompareId = createMemo(() => {
		const compare = props.compareId
		if (!compare || compare === props.correctionId) return
		return compare
	})

	const diffQuery = useQuery(() => {
		const compare = activeCompareId()
		if (compare) {
			return CorrectionQueryOption.compare(compare, props.correctionId)
		}
		return CorrectionQueryOption.diff(props.correctionId)
	})

	const historyQuery = useQuery(() => {
		const correction = correctionQuery.data
		if (!correction) {
			return {
				queryKey: ["correction::history", "pending", props.correctionId],
				queryFn: () => [],
			}
		}

		return CorrectionQueryOption.history(
			ENTITY_HISTORY_MAP[correction.entity_type],
			correction.entity_id,
		)
	})

	const compareOptions = createMemo(() => {
		const items = historyQuery.data ?? []
		return items.filter((item) => item.id !== props.correctionId)
	})

	const compareSelectOptions = createMemo(() => [
		COMPARE_BASELINE_VALUE,
		...compareOptions().map((item) => item.id.toString()),
	])

	const getCompareLabel = (value: string) => {
		if (value === COMPARE_BASELINE_VALUE) return t`Previous approved baseline`
		const target = compareOptions().find((item) => item.id.toString() === value)
		if (!target) return value
		return `#${target.id} ${target.type} (${formatTimestamp(target.handled_at ?? target.created_at, t`None`)})`
	}

	const refreshCorrection = () => {
		const correction = correctionQuery.data
		void queryClient.invalidateQueries({
			queryKey: ["correction::detail", props.correctionId],
		})
		void queryClient.invalidateQueries({ queryKey: ["correction::diff"] })
		void queryClient.invalidateQueries({ queryKey: ["correction::history"] })
		if (correction) {
			void invalidatePendingCorrection(
				queryClient,
				ENTITY_HISTORY_MAP[correction.entity_type],
				correction.entity_id,
			)
		}
	}

	const handleCorrectionAction = (method: HandleCorrectionMethod) => {
		handleCorrectionMutation.mutate(method, {
			onSuccess: () => {
				refreshCorrection()
				showSuccessToast({
					title:
						method === "Approve"
							? t`Correction approved`
							: t`Correction rejected`,
					description: t`Status updated`,
				})
			},
		})
	}

	const actionErrorMessage = createMemo(() => {
		if (!handleCorrectionMutation.isError) return
		return getErrorMessage(handleCorrectionMutation.error, t`Request failed.`)
	})

	return (
		<PageLayout class="p-8">
			<Show
				when={correctionQuery.data}
				fallback={<div class="text-sm text-tertiary">{t`Loading...`}</div>}
			>
				{(correction) => (
					<div class="flex flex-col gap-6">
						<CorrectionHeader
							correction={correction()}
							actions={
								<CorrectionActions
									canManage={canManage()}
									canEdit={canEdit()}
									correction={correction()}
									isBusy={handleCorrectionMutation.isPending}
									errorMessage={actionErrorMessage()}
									onApprove={() => handleCorrectionAction("Approve")}
									onReject={() => handleCorrectionAction("Reject")}
								/>
							}
						/>
						<Card class={SECTION_CARD_CLASS}>
							<div class={SECTION_HEADER_CLASS}>
								<div class="min-w-0 space-y-1">
									<div class={DIFF_HEADER_TITLE_CLASS}>{t`DIFF`}</div>
									<Switch>
										<Match when={diffQuery.isLoading}>
											<div class="text-xs text-tertiary">{t`Loading...`}</div>
										</Match>
										<Match when={!diffQuery.data}>
											<div class="text-xs text-tertiary">
												{t`No diff data.`}
											</div>
										</Match>
									</Switch>
								</div>

								<label class="flex flex-wrap items-center gap-2">
									<span class={DETAIL_LABEL_CLASS}>{t`Compare`}</span>
									<Select.Root<string>
										options={compareSelectOptions()}
										value={
											activeCompareId()?.toString() ?? COMPARE_BASELINE_VALUE
										}
										onChange={(value) => {
											const next =
												value === COMPARE_BASELINE_VALUE
													? undefined
													: Number(value)
											props.onCompareIdChange(next)
										}}
										itemComponent={(itemProps) => (
											<Select.Item item={itemProps.item}>
												{getCompareLabel(itemProps.item.rawValue)}
											</Select.Item>
										)}
									>
										<Select.Trigger
											class={twMerge(
												INPUT_LIKE_BASE_CLASS,
												"h-9 min-w-52 px-2 text-sm",
											)}
										>
											<Select.Value<string>>
												{(state) => getCompareLabel(state.selectedOption())}
											</Select.Value>
											<Select.Icon />
										</Select.Trigger>
										<Select.Portal>
											<Select.Content>
												<Select.Listbox />
											</Select.Content>
										</Select.Portal>
									</Select.Root>
								</label>
							</div>

							<DiffEntries
								changes={diffQuery.data?.changes}
								isLoading={diffQuery.isLoading}
							/>
						</Card>

						<Show
							when={props.correctionId}
							keyed
						>
							{(correctionId) => (
								<CorrectionComments
									correctionId={correctionId}
									comments={allComments()}
									hasMore={hasMoreComments()}
									isLoadingMore={commentPagesQuery.isFetchingNextPage}
									currentUser={userCtx.user}
									canManage={canManage()}
									onLoadMore={() => void loadMore()}
									onCreateComment={onCreateComment}
									onDeleteComment={onDeleteComment}
								/>
							)}
						</Show>
					</div>
				)}
			</Show>
		</PageLayout>
	)
}
