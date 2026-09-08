import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { DotsHorizontalIcon } from "@thc/icons/radix"
import { createSignal, For, Match, Show, Switch } from "solid-js"

import { DropdownMenu } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import type { UserCollection } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import { animationStyles } from "../../style/animations.stylex"
import { CollectionFormDialog } from "./CollectionFormDialog"
import { CollectionItemCard } from "./CollectionItemCard"
import type { UserCollectionItemDetail } from "./CollectionItemCard"
import { CollectionLoadMore } from "./CollectionLoadMore"

const styles = stylex.create({
	dotsHorizontalIcon: { width: px[16], height: px[16] },
	metadata: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		rowGap: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	owner: { minWidth: 0, overflowWrap: "break-word" },
	ownerLink: {
		fontWeight: 500,
		color: colors.textPrimary,
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	separator: {
		marginLeft: px[8],
		marginRight: px[8],
		color: palette.slate[300],
	},
	followError: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: "flex",
		flexDirection: "column",
		gap: px[16],
		borderColor: palette.slate[300],
		paddingBottom: px[24],
	},
	heading: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: px[16],
	},
	title: {
		minWidth: 0,
		overflowWrap: "break-word",
		fontSize: fontSizes["3xl"],
		lineHeight: 1.2,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	description: {
		marginTop: px[8],
		whiteSpace: "pre-wrap",
		overflowWrap: "break-word",
		color: colors.textSecondary,
	},
	list: { display: "flex", flexDirection: "column", gap: px[12] },
	main: { display: "flex", flexDirection: "column", gap: px[16] },
	statusPanel: {
		display: "grid",
		minHeight: px[128],
		placeItems: "center",
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderStyle: "dashed",
		borderColor: palette.slate[300],
	},
	statusMessage: {
		display: "inline-flex",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.full,
		backgroundColor: palette.white,
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[4],
		paddingBottom: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		boxShadow: `inset 0 0 0 1px ${palette.slate[200]}, 0 1px 2px 0 rgb(0 0 0 / 0.05)`,
	},
	loadingDot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: palette.slate[300],
	},
	errorPanel: {
		display: "grid",
		minHeight: px[128],
		placeItems: "center",
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderStyle: "dashed",
	},
	errorContent: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: px[8],
	},
	errorMessage: {
		display: "inline-flex",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.full,
		backgroundColor: palette.white,
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[4],
		paddingBottom: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		boxShadow: "inset 0 0 0 1px currentColor, 0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	errorDot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
	},
	emptyDot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: palette.slate[300],
	},
	loadMore: { paddingTop: px[8] },
	detail: { display: "flex", flexDirection: "column", gap: px[24] },
})

type LoadingItemsFetchState = { status: "loading" }

type ErrorItemsFetchState = { status: "error" }

type SuccessItemsFetchState = {
	status: "success"
	items: UserCollectionItemDetail[]
	isFetchingMore: boolean
	hasMore: boolean
}

type ItemsFetchState =
	| LoadingItemsFetchState
	| ErrorItemsFetchState
	| SuccessItemsFetchState

type OwnerViewer = {
	role: "owner"
	isDeletingCollection: boolean
	isDeletingItem: boolean
	isReorderingItems: boolean
}

type VisitorViewer = {
	role: "visitor"
	isFollowing: boolean
	isTogglingFollow: boolean
	followErrorMessage?: string
}

type ReadonlyViewer = { role: "readonly" }

type CollectionDetailViewer = OwnerViewer | VisitorViewer | ReadonlyViewer

export type CollectionDetailModel = {
	collection: UserCollection
	items: ItemsFetchState
	viewer: CollectionDetailViewer
}

export type CollectionDetailController = {
	retryItems: () => void
	loadMoreItems: () => void
	deleteCollection: () => void
	deleteItem: (itemId: number) => void
	reorderItems: (itemIds: number[]) => void
	toggleFollow: () => void
}

type OwnerCollectionActionsProps = {
	owner: OwnerViewer
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function OwnerCollectionActions(props: OwnerCollectionActionsProps) {
	const { t } = useLingui()
	const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false)
	const closeDeleteDialog = () => setDeleteDialogOpen(false)

	return (
		<>
			<DropdownMenu.Root
				placement="bottom-end"
				gutter={6}
			>
				<DropdownMenu.Trigger aria-label={t`Collection actions`}>
					<DropdownMenu.Icon>
						<DotsHorizontalIcon {...stylex.attrs(styles.dotsHorizontalIcon)} />
					</DropdownMenu.Icon>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content>
						<DropdownMenu.Item onSelect={props.onEditCollection}>
							{t`Edit Collection`}
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={
								props.owner.isDeletingItem || props.owner.isReorderingItems
							}
							onSelect={props.onToggleEditingItems}
						>
							{props.isEditingItems ? t`Done` : t`Edit items`}
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							disabled={props.owner.isDeletingCollection}
							onSelect={() => setDeleteDialogOpen(true)}
						>
							{t`Delete`}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
			<AlertDialog
				open={deleteDialogOpen()}
				onOpenChange={setDeleteDialogOpen}
				title={t`Delete Collection`}
				description={t`Are you sure you want to delete this collection? This action cannot be undone.`}
				confirmText={t`Delete`}
				onCancel={closeDeleteDialog}
				onConfirm={props.controller.deleteCollection}
			/>
		</>
	)
}

type VisitorCollectionActionsProps = {
	visitor: VisitorViewer
	controller: CollectionDetailController
}

function VisitorCollectionActions(props: VisitorCollectionActionsProps) {
	const { t } = useLingui()
	const followButtonText = (visitor: VisitorViewer) => {
		if (visitor.isTogglingFollow) return t`Loading...`
		return visitor.isFollowing ? t`Unfollow` : t`Follow`
	}

	return (
		<Button
			disabled={props.visitor.isTogglingFollow}
			onClick={props.controller.toggleFollow}
			appearance="outline"
			tone="gray"
			size="sm"
		>
			{followButtonText(props.visitor)}
		</Button>
	)
}

type CollectionHeaderActionsProps = {
	viewer: CollectionDetailViewer
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function CollectionHeaderActions(props: CollectionHeaderActionsProps) {
	return (
		<Switch>
			<Match when={props.viewer.role === "owner" ? props.viewer : undefined}>
				{(owner) => (
					<OwnerCollectionActions
						owner={owner()}
						controller={props.controller}
						isEditingItems={props.isEditingItems}
						onEditCollection={props.onEditCollection}
						onToggleEditingItems={props.onToggleEditingItems}
					/>
				)}
			</Match>
			<Match when={props.viewer.role === "visitor" ? props.viewer : undefined}>
				{(visitor) => (
					<VisitorCollectionActions
						visitor={visitor()}
						controller={props.controller}
					/>
				)}
			</Match>
		</Switch>
	)
}

function CollectionMetadata(props: { collection: UserCollection }) {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(styles.metadata)}>
			<span {...stylex.attrs(styles.owner)}>
				{t`Created by`}{" "}
				<Link
					to="/profile/$username"
					params={{ username: props.collection.owner.name }}
					class={stylex.attrs(link.base, link.text, styles.ownerLink).class}
				>
					{props.collection.owner.name}
				</Link>
			</span>
			<span {...stylex.attrs(styles.separator)}>•</span>
			<span>{props.collection.is_public ? t`Public` : t`Private`}</span>
			<span {...stylex.attrs(styles.separator)}>•</span>
			<span>
				{props.collection.item_count}{" "}
				{props.collection.item_count === 1 ? t`item` : t`items`}
			</span>
		</div>
	)
}

function VisitorFollowError(props: { viewer: CollectionDetailViewer }) {
	return (
		<Switch>
			<Match
				when={
					props.viewer.role === "visitor"
						? props.viewer.followErrorMessage
						: undefined
				}
			>
				{(message) => (
					<div {...stylex.attrs(styles.followError)}>{message()}</div>
				)}
			</Match>
		</Switch>
	)
}

type CollectionDetailHeaderProps = {
	model: CollectionDetailModel
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function CollectionDetailHeader(props: CollectionDetailHeaderProps) {
	return (
		<header {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.heading)}>
				<h1 {...stylex.attrs(styles.title)}>{props.model.collection.name}</h1>
				<CollectionHeaderActions
					viewer={props.model.viewer}
					controller={props.controller}
					isEditingItems={props.isEditingItems}
					onEditCollection={props.onEditCollection}
					onToggleEditingItems={props.onToggleEditingItems}
				/>
			</div>

			<CollectionMetadata collection={props.model.collection} />

			<Show when={props.model.collection.description}>
				<p {...stylex.attrs(styles.description)}>
					{props.model.collection.description}
				</p>
			</Show>
			<VisitorFollowError viewer={props.model.viewer} />
		</header>
	)
}

type OwnerItemsListProps = {
	state: SuccessItemsFetchState
	owner: OwnerViewer
	controller: CollectionDetailController
	isEditingItems: boolean
}

function OwnerItemsList(props: OwnerItemsListProps) {
	const canReorderItems = () => {
		return (
			!props.state.hasMore
			&& !props.state.isFetchingMore
			&& !props.owner.isReorderingItems
			&& !props.owner.isDeletingItem
			&& props.state.items.length > 1
		)
	}
	const moveItem = (itemId: number, offset: -1 | 1) => {
		const { items } = props.state
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
		props.controller.reorderItems(itemIds)
	}

	return (
		<ul {...stylex.attrs(styles.list)}>
			<For each={props.state.items}>
				{(item, index) => (
					<CollectionItemCard
						item={item}
						number={index() + 1}
						isEditing={props.isEditingItems}
						isDeleting={props.owner.isDeletingItem}
						isReordering={props.owner.isReorderingItems}
						canMoveUp={canReorderItems() && index() > 0}
						canMoveDown={
							canReorderItems() && index() < props.state.items.length - 1
						}
						onDelete={() => props.controller.deleteItem(item.id)}
						onMoveUp={() => moveItem(item.id, -1)}
						onMoveDown={() => moveItem(item.id, 1)}
					/>
				)}
			</For>
		</ul>
	)
}

type CollectionItemsProps = {
	model: CollectionDetailModel
	controller: CollectionDetailController
	isEditingItems: boolean
}

function CollectionItems(props: CollectionItemsProps) {
	const { t } = useLingui()

	return (
		<main {...stylex.attrs(styles.main)}>
			<Switch>
				<Match when={props.model.items.status === "loading"}>
					<div {...stylex.attrs(styles.statusPanel)}>
						<div {...stylex.attrs(styles.statusMessage)}>
							<span
								{...stylex.attrs(styles.loadingDot, animationStyles.pulse)}
							></span>
							{t`Loading items...`}
						</div>
					</div>
				</Match>
				<Match when={props.model.items.status === "error"}>
					<div {...stylex.attrs(styles.errorPanel)}>
						<div {...stylex.attrs(styles.errorContent)}>
							<div {...stylex.attrs(styles.errorMessage)}>
								<span {...stylex.attrs(styles.errorDot)}></span>
								{t`Failed to load items.`}
							</div>
							<Button
								onClick={props.controller.retryItems}
								appearance="outline"
								tone="gray"
								size="sm"
							>
								{t`Retry`}
							</Button>
						</div>
					</div>
				</Match>
				<Match
					when={
						props.model.items.status === "success"
							? props.model.items
							: undefined
					}
				>
					{(state) => (
						<>
							<Switch
								fallback={
									<ul {...stylex.attrs(styles.list)}>
										<For each={state().items}>
											{(item, index) => (
												<CollectionItemCard
													item={item}
													number={index() + 1}
													isEditing={false}
													isDeleting={false}
													isReordering={false}
													canMoveUp={false}
													canMoveDown={false}
													onDelete={() => undefined}
													onMoveUp={() => undefined}
													onMoveDown={() => undefined}
												/>
											)}
										</For>
									</ul>
								}
							>
								<Match when={state().items.length === 0}>
									<div {...stylex.attrs(styles.statusPanel)}>
										<div {...stylex.attrs(styles.statusMessage)}>
											<span {...stylex.attrs(styles.emptyDot)}></span>
											{t`This collection is empty`}
										</div>
									</div>
								</Match>
								<Match
									when={
										props.model.viewer.role === "owner"
											? props.model.viewer
											: undefined
									}
								>
									{(owner) => (
										<OwnerItemsList
											state={state()}
											owner={owner()}
											controller={props.controller}
											isEditingItems={props.isEditingItems}
										/>
									)}
								</Match>
							</Switch>
							<div {...stylex.attrs(styles.loadMore)}>
								<CollectionLoadMore
									when={state().hasMore || state().isFetchingMore}
									isLoading={state().isFetchingMore}
									onLoadMore={props.controller.loadMoreItems}
								/>
							</div>
						</>
					)}
				</Match>
			</Switch>
		</main>
	)
}

type Props = {
	model: CollectionDetailModel
	controller: CollectionDetailController
}

export function CollectionDetailPage(props: Props) {
	const [editOpen, setEditOpen] = createSignal(false)
	const [isEditingItems, setIsEditingItems] = createSignal(false)

	return (
		<div {...stylex.attrs(styles.detail)}>
			<CollectionDetailHeader
				model={props.model}
				controller={props.controller}
				isEditingItems={isEditingItems()}
				onEditCollection={() => setEditOpen(true)}
				onToggleEditingItems={() => setIsEditingItems((editing) => !editing)}
			/>
			<CollectionItems
				model={props.model}
				controller={props.controller}
				isEditingItems={isEditingItems()}
			/>
			<Show when={editOpen()}>
				<CollectionFormDialog
					open={editOpen()}
					onOpenChange={setEditOpen}
					collection={props.model.collection}
				/>
			</Show>
		</div>
	)
}
