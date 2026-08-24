import { useLingui } from "@lingui/solid/macro"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import type { JSX } from "solid-js"
import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge, twJoin } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"
import { Dialog } from "~/component/dialog"
import { PRIMARY_TAG_RELEVANCE_THRESHOLD } from "~/domain/tag/constants"
import {
	deleteVoteMutation,
	getTagsOptions,
	getTagsQueryKey,
	voteTagMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"

import { EntityTagAddDialog } from "./EntityTagAddDialog"
import {
	ENTITY_TAG_VOTE_OPTIONS,
	createEntityTagFilter,
	scoreFromUserVote,
	sortEntityTags,
} from "./model"
import type {
	EntityTagAggregate,
	EntityTagVoteValue,
	EntityTaggableType,
} from "./model"

type EntityTagsProps = {
	class?: string
	entityType: EntityTaggableType
	entityId: number
}

const TAG_QUERY_LIMIT = 100

type ManageTagsDialogProps = {
	tags: EntityTagAggregate[]
	isSignedIn: boolean
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
	trigger: JSX.Element
}

type EntityTagRowProps = {
	tag: EntityTagAggregate
	isSignedIn: boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
}

export function EntityTags(props: EntityTagsProps) {
	const userCtx = useCurrentUser()
	const queryClient = useQueryClient()
	const [pendingKey, setPendingKey] = createSignal<string>()
	const tagsRequest = createMemo(() => ({
		path: {
			entity_type: props.entityType,
			id: props.entityId,
		},
		query: {
			limit: TAG_QUERY_LIMIT,
		},
	}))
	const tagsQuery = useQuery(() => getTagsOptions(tagsRequest()))
	const voteMutation = useMutation(() => voteTagMutation())
	const removeMutation = useMutation(() => deleteVoteMutation())
	const tags = createMemo(() =>
		sortEntityTags((tagsQuery.data?.data ?? { items: [] }).items),
	)
	const dataFilter = createMemo(() => createEntityTagFilter(tags()))

	const invalidateTags = async () => {
		await queryClient.invalidateQueries({
			queryKey: getTagsQueryKey(tagsRequest()),
		})
	}

	const vote = async (tagId: number, score: EntityTagVoteValue) => {
		setPendingKey(`vote:${tagId}`)
		try {
			await voteMutation.mutateAsync({
				path: tagsRequest().path,
				body: {
					tag_id: tagId,
					score,
				},
			})
			await invalidateTags()
		} finally {
			setPendingKey(undefined)
		}
	}

	const removeVote = async (tagId: number) => {
		setPendingKey(`remove:${tagId}`)
		try {
			await removeMutation.mutateAsync({
				path: tagsRequest().path,
				body: {
					tag_id: tagId,
				},
			})
			await invalidateTags()
		} finally {
			setPendingKey(undefined)
		}
	}

	return (
		<EntityTagsView
			class={props.class}
			tags={tags()}
			isSignedIn={userCtx.profile !== undefined}
			isLoading={tagsQuery.isLoading}
			dataFilter={dataFilter()}
			pendingKey={pendingKey()}
			onVote={vote}
			onRemoveVote={removeVote}
		/>
	)
}

export type EntityTagsViewProps = {
	class?: string
	tags: EntityTagAggregate[]
	isSignedIn: boolean
	isLoading: boolean
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
}

export function EntityTagsView(props: EntityTagsViewProps) {
	const { t } = useLingui()
	const tags = createMemo(() => {
		const primaryTags: EntityTagAggregate[] = []
		const secondaryTags: EntityTagAggregate[] = []

		for (const tag of props.tags) {
			if (tag.relevance > PRIMARY_TAG_RELEVANCE_THRESHOLD) {
				primaryTags.push(tag)
			} else {
				secondaryTags.push(tag)
			}
		}

		return { primaryTags, secondaryTags }
	})
	const primaryTags = () => tags().primaryTags
	const secondaryTags = () => tags().secondaryTags

	return (
		<div
			class={twMerge(
				"grid min-h-6 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4",
				props.class,
			)}
		>
			<div class="text-sm text-tertiary">{t`Tags`}</div>
			<Switch>
				<Match when={props.isLoading}>
					<div>
						<span class="text-xs text-tertiary">{t`Loading...`}</span>
					</div>
				</Match>
				<Match when={props.tags.length === 0}>
					<div class="text-xs text-tertiary">{t`No tags yet`}</div>
				</Match>
				<Match when={props.tags.length > 0}>
					<div class="flex min-w-0 flex-col gap-1">
						<Show when={primaryTags().length > 0}>
							<div class="text-sm text-primary">
								<Intersperse
									of={primaryTags()}
									with=", "
								>
									{(tag) => (
										<Link
											to="/tag/$id"
											params={{ id: tag.id.toString() }}
										>
											{tag.name}
										</Link>
									)}
								</Intersperse>
							</div>
						</Show>

						<Show when={secondaryTags().length > 0}>
							<div
								class={twJoin(
									primaryTags().length > 0 ? "text-xs" : "text-sm",
									"text-tertiary",
								)}
							>
								<Intersperse
									of={secondaryTags()}
									with=", "
								>
									{(tag) => (
										<Link
											to="/tag/$id"
											params={{ id: tag.id.toString() }}
											class="text-tertiary"
										>
											{tag.name}
										</Link>
									)}
								</Intersperse>
							</div>
						</Show>
					</div>
				</Match>
			</Switch>
			<Show when={!props.isLoading && props.isSignedIn}>
				<ManageTagsDialog
					tags={props.tags}
					isSignedIn={props.isSignedIn}
					dataFilter={props.dataFilter}
					pendingKey={props.pendingKey}
					onVote={props.onVote}
					onRemoveVote={props.onRemoveVote}
					trigger={
						<Dialog.Trigger
							as={Button}
							variant="Tertiary"
							class="size-6"
						>
							{props.tags.length ? <Pencil1Icon /> : <PlusIcon />}
						</Dialog.Trigger>
					}
				/>
			</Show>
		</div>
	)
}

function ManageTagsDialog(props: ManageTagsDialogProps) {
	const { t } = useLingui()
	return (
		<Dialog.Root>
			{props.trigger}
			<Dialog.Portal>
				<Dialog.Overlay data-blur />
				<Dialog.Content class="flex min-h-[60vh] w-full max-w-4xl flex-col rounded-md bg-white p-6 shadow-xl">
					<div class="mb-2 flex shrink-0 items-center gap-4">
						<Dialog.Title class="text-xl font-light tracking-tight">{t`Manage Tags`}</Dialog.Title>
						<div class="rounded bg-slate-100 px-2 py-0.5 text-sm font-medium text-tertiary">
							{props.tags.length}
						</div>
						<div class="flex-1"></div>
						<Show when={props.isSignedIn}>
							<EntityTagAddDialog
								dataFilter={props.dataFilter}
								pendingKey={props.pendingKey}
								onVote={props.onVote}
								trigger={
									<Dialog.Trigger
										as={Button}
										variant="SecondaryV2"
										size="Sm"
									>
										<PlusIcon class="size-4" />
										{t`Add tag`}
									</Dialog.Trigger>
								}
							/>
						</Show>
						<Dialog.CloseButton
							variant="Tertiary"
							class="flex h-8 w-8 items-center justify-center p-0 text-slate-500"
						>
							<Cross1Icon class="size-4" />
						</Dialog.CloseButton>
					</div>
					<ul class="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
						<For each={props.tags}>
							{(tag) => (
								<EntityTagRow
									tag={tag}
									isSignedIn={props.isSignedIn}
									pendingKey={props.pendingKey}
									onVote={props.onVote}
									onRemoveVote={props.onRemoveVote}
								/>
							)}
						</For>
					</ul>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function EntityTagRow(props: EntityTagRowProps) {
	const { t } = useLingui()
	const votes = () => props.tag.votes ?? []
	const votePending = (value: EntityTagVoteValue) =>
		props.pendingKey === `vote:${props.tag.id}`
		&& scoreFromUserVote(props.tag.user_vote) !== value
	const isPending = () =>
		props.pendingKey === `vote:${props.tag.id}`
		|| props.pendingKey === `remove:${props.tag.id}`

	return (
		<li class="flex flex-wrap items-center justify-between gap-4 py-3">
			<div class="min-w-0 flex-1 space-y-1">
				<Link
					to="/tag/$id"
					params={{ id: props.tag.id.toString() }}
					class="text-lg font-light text-primary"
				>
					{props.tag.name}
				</Link>
				<Show when={props.tag.short_description}>
					<div class="line-clamp-2 text-sm text-tertiary">
						{props.tag.short_description}
					</div>
				</Show>
				<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tertiary">
					<div>
						<TagSummaryText
							count={props.tag.count}
							relevance={props.tag.relevance}
						/>
					</div>
				</div>
				<Show when={votes().length > 0}>
					<div class="mt-2 flex flex-col gap-1 text-xs text-tertiary">
						<For each={votes()}>
							{(vote) => (
								<div>
									<span class="font-medium">{vote.user_name}</span> voted{" "}
									<span class="font-medium">{vote.score}</span>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
			<Show when={props.isSignedIn}>
				<div class="flex shrink-0 flex-wrap items-center gap-2">
					<For each={ENTITY_TAG_VOTE_OPTIONS}>
						{(option) => (
							<Button
								size="Sm"
								variant={
									props.tag.user_vote === option.userVote
										? "PrimaryV2"
										: "SecondaryV2"
								}
								disabled={isPending()}
								onClick={() => void props.onVote(props.tag.id, option.value)}
								class={twMerge(
									"min-w-16",
									votePending(option.value) && "opacity-70",
								)}
							>
								<VoteOptionLabel value={option.value} />
							</Button>
						)}
					</For>
					<Show
						when={
							props.tag.user_vote !== null && props.tag.user_vote !== undefined
						}
					>
						<Button
							size="Sm"
							variant="Tertiary"
							disabled={isPending()}
							onClick={() => void props.onRemoveVote(props.tag.id)}
							class="flex h-8 w-8 items-center justify-center p-0 text-slate-500"
							title={t`Remove`}
						>
							<Cross1Icon class="size-4" />
						</Button>
					</Show>
				</div>
			</Show>
		</li>
	)
}

function VoteOptionLabel(props: { value: EntityTagVoteValue }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "High": {
				return t`High`
			}
			case "Medium": {
				return t`Medium`
			}
			case "Low": {
				return t`Low`
			}
			case "Veto": {
				return t`Downvote`
			}
		}
	}

	return <>{label()}</>
}

function TagSummaryText(props: { count: number; relevance: number }) {
	const { t } = useLingui()

	const label = () =>
		t`${{ count: props.count }} votes · relevance ${{
			relevance: props.relevance.toFixed(2),
		}}`

	return <>{label()}</>
}
