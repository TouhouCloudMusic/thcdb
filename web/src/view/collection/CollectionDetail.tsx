import { useLingui } from "@lingui/solid/macro"
import { createSignal, For, Match, Show, Switch } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import type { UserCollection } from "~/hey-api"
import { useCurrentUser } from "~/state/user"

import { CollectionFormDialog } from "./CollectionFormDialog"
import { CollectionItemCard } from "./CollectionItemCard"
import type { UserCollectionItemDetail } from "./CollectionItemCard"

export type ItemsFetchState =
	| { status: "loading" }
	| { status: "error"; onRetry: () => void }
	| {
			status: "success"
			items: UserCollectionItemDetail[]
			isFetchingMore: boolean
			hasMore: boolean
			onLoadMore: () => void
	  }

type Props = {
	collection: UserCollection
	itemsFetchState: ItemsFetchState
	isDeletingCollection: boolean
	isDeletingItem: boolean
	isReorderingItems: boolean
	onDeleteCollection: () => void
	onDeleteItem: (itemId: number) => void
	onReorderItems: (itemIds: number[]) => void
}

export function CollectionDetailPage(props: Props) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const isOwner = () => userCtx.user?.name === props.collection.owner.name

	const [editOpen, setEditOpen] = createSignal(false)
	const [isEditingItems, setIsEditingItems] = createSignal(false)

	const successState = () =>
		props.itemsFetchState.status === "success" ? props.itemsFetchState : null
	const errorState = () =>
		props.itemsFetchState.status === "error" ? props.itemsFetchState : null

	const canReorderItems = () => {
		const state = successState()
		if (!state) return false
		return (
			!state.hasMore
			&& !state.isFetchingMore
			&& !props.isReorderingItems
			&& !props.isDeletingItem
			&& state.items.length > 1
		)
	}

	const moveItem = (itemId: number, offset: -1 | 1) => {
		const state = successState()
		if (!state) return
		const { items } = state
		const index = items.findIndex((item) => item.id === itemId)
		const targetIndex = index + offset

		if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
			return
		}

		const currentItemId = items[index]?.id
		const targetItemId = items[targetIndex]?.id

		if (currentItemId === undefined || targetItemId === undefined) {
			return
		}

		const itemIds = items.map((item) => item.id)
		itemIds[index] = targetItemId
		itemIds[targetIndex] = currentItemId
		props.onReorderItems(itemIds)
	}

	return (
		<div class="flex w-full flex-col gap-6">
			<header class="flex flex-col gap-4 border-b border-slate-300 pb-6">
				<div class="flex items-start justify-between gap-4">
					<h1 class="text-3xl font-light tracking-tight text-primary">
						{props.collection.name}
					</h1>
					<Show when={isOwner()}>
						<div class="flex items-center gap-2">
							<Button
								variant="SecondaryV2"
								size="Sm"
								onClick={() => setEditOpen(true)}
							>
								{t`Edit Collection`}
							</Button>
							<Button
								variant="SecondaryV2"
								size="Sm"
								disabled={props.isDeletingItem || props.isReorderingItems}
								onClick={() => setIsEditingItems((editing) => !editing)}
							>
								{isEditingItems() ? t`Done` : t`Edit items`}
							</Button>
							<AlertDialog
								title={t`Delete Collection`}
								description={t`Are you sure you want to delete this collection? This action cannot be undone.`}
								confirmText={t`Delete`}
								onCancel={() => undefined}
								onConfirm={props.onDeleteCollection}
								triggerAs={(triggerProps) => (
									<Button
										{...triggerProps}
										variant="SecondaryV2"
										size="Sm"
										disabled={props.isDeletingCollection}
									>
										{t`Delete`}
									</Button>
								)}
							/>
						</div>
					</Show>
				</div>

				<div class="flex items-center text-sm text-tertiary">
					<span>
						{t`Created by`}{" "}
						<Link
							to="/profile/$username"
							params={{ username: props.collection.owner.name }}
							class="font-medium text-primary hover:underline"
						>
							{props.collection.owner.name}
						</Link>
					</span>
					<span class="mx-2 text-slate-300">•</span>
					<span>{props.collection.is_public ? t`Public` : t`Private`}</span>
					<span class="mx-2 text-slate-300">•</span>
					<span>
						{props.collection.item_count}{" "}
						{props.collection.item_count === 1 ? t`item` : t`items`}
					</span>
				</div>

				<Show when={props.collection.description}>
					<p class="mt-2 whitespace-pre-wrap text-secondary">
						{props.collection.description}
					</p>
				</Show>
			</header>

			<main class="flex flex-col gap-4">
				<Switch>
					<Match when={props.itemsFetchState.status === "loading"}>
						<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-slate-300 bg-slate-50/50">
							<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-tertiary shadow-xs ring-1 ring-slate-200 ring-inset">
								<span class="inline-block size-1.5 animate-pulse rounded-full bg-slate-300"></span>
								{t`Loading items...`}
							</div>
						</div>
					</Match>
					<Match when={errorState()}>
						{(state) => (
							<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-red-200 bg-red-50/50">
								<div class="flex flex-col items-center gap-2">
									<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-red-600 shadow-xs ring-1 ring-red-200 ring-inset">
										<span class="inline-block size-1.5 rounded-full bg-red-400"></span>
										{t`Failed to load items.`}
									</div>
									<Button
										variant="SecondaryV2"
										size="Sm"
										onClick={state().onRetry}
									>
										{t`Retry`}
									</Button>
								</div>
							</div>
						)}
					</Match>
					<Match when={successState()}>
						{(state) => (
							<>
								<Show
									when={state().items.length > 0}
									fallback={
										<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-slate-300 bg-slate-50/50">
											<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-tertiary shadow-xs ring-1 ring-slate-200 ring-inset">
												<span class="inline-block size-1.5 rounded-full bg-slate-300"></span>
												{t`This collection is empty`}
											</div>
										</div>
									}
								>
									<ul class="flex flex-col gap-3">
										<For each={state().items}>
											{(item, index) => {
												const canMoveItem = () => canReorderItems()

												return (
													<CollectionItemCard
														item={item}
														isEditing={isEditingItems()}
														isDeleting={
															props.isDeletingItem || props.isReorderingItems
														}
														isReordering={props.isReorderingItems}
														canMoveUp={canMoveItem() && index() > 0}
														canMoveDown={
															canMoveItem()
															&& index() < state().items.length - 1
														}
														onDelete={() => props.onDeleteItem(item.id)}
														onMoveUp={() => moveItem(item.id, -1)}
														onMoveDown={() => moveItem(item.id, 1)}
													/>
												)
											}}
										</For>
									</ul>
								</Show>
								<Show when={state().hasMore || state().isFetchingMore}>
									<div class="flex justify-center pt-2">
										<Button
											variant="SecondaryV2"
											size="Sm"
											disabled={state().isFetchingMore}
											onClick={state().onLoadMore}
										>
											{state().isFetchingMore ? t`Loading...` : t`Load more`}
										</Button>
									</div>
								</Show>
							</>
						)}
					</Match>
				</Switch>
			</main>

			<Show when={editOpen()}>
				<CollectionFormDialog
					open={editOpen()}
					onOpenChange={setEditOpen}
					collection={props.collection}
				/>
			</Show>
		</div>
	)
}
