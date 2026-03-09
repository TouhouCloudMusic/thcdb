import { useQuery } from "@tanstack/solid-query"
import { TagApi } from "@thc/api"
import type { Tag } from "@thc/api"
import { Either } from "effect"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"

import { Link } from "~/component/atomic"
import {
	EmptyExplorePlaceholder,
	ExplorePageLayout,
} from "~/component/feature/entity_explore"

const DEFAULT_DEPTH = 2
const ROOT_COUNT = 6
const MAX_DEPTH = 4
const TREE_HEADING_ID = "tag-tree-title"

export function TagExplore() {
	const [expandedIdsOverride, setExpandedIdsOverride] =
		createSignal<Set<number> | null>(null)
	const [activeTreeItemId, setActiveTreeItemId] = createSignal<number | null>(
		null,
	)
	const treeItemRefs = new Map<number, HTMLLIElement>()

	const queryOptions = () => ({
		queryKey: ["tag::tree", ROOT_COUNT, MAX_DEPTH, DEFAULT_DEPTH],
		queryFn: async () => {
			const res = await TagApi.explore({
				query: { page: 1, limit: ROOT_COUNT },
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})

			return paginated.items.map(
				(tag): TagTreeNode => ({
					id: tag.id,
					name: tag.name,
					type: tag.type,
					short_description: tag.short_description,
					children: [],
				}),
			)
		},
	})

	const treeQuery = useQuery(queryOptions)
	const nodes = () => treeQuery.data ?? []
	const seededExpandedIds = createMemo(() =>
		collectExpandedIds(nodes(), DEFAULT_DEPTH),
	)
	const expandedIds = createMemo(
		() => expandedIdsOverride() ?? seededExpandedIds(),
	)
	const treeIndex = createMemo(() => buildTagTreeIndex(nodes()))
	const visibleIds = createMemo(() =>
		collectVisibleNodeIds(nodes(), expandedIds()),
	)
	const visibleIdSet = createMemo(() => new Set(visibleIds()))
	const resolvedActiveTreeItemId = createMemo(() =>
		resolveActiveTreeId(
			activeTreeItemId(),
			visibleIds(),
			visibleIdSet(),
			treeIndex().parentById,
		),
	)

	const toggleExpanded = (id: number, depth: number, expanded: boolean) => {
		setExpandedIdsOverride((prev) => {
			const base = prev ?? seededExpandedIds()

			if (depth === 0 && expanded) {
				return new Set<number>()
			}

			const next = new Set(base)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	const focusTreeItem = (id: number) => {
		setActiveTreeItemId(id)
		queueMicrotask(() => {
			treeItemRefs.get(id)?.focus()
		})
	}

	// oxlint-disable-next-line complexity
	const handleTreeKeyDown = (id: number, event: KeyboardEvent) => {
		const key = event.key
		const ids = visibleIds()
		const currentIndex = ids.indexOf(id)

		if (key === "ArrowDown") {
			if (currentIndex === -1 || currentIndex >= ids.length - 1) return
			event.preventDefault()
			const nextId = ids[currentIndex + 1]
			if (nextId === undefined) return
			focusTreeItem(nextId)
			return
		}

		if (key === "ArrowUp") {
			if (currentIndex <= 0) return
			event.preventDefault()
			const prevId = ids[currentIndex - 1]
			if (prevId === undefined) return
			focusTreeItem(prevId)
			return
		}

		if (key === "Home") {
			const firstId = ids[0]
			if (firstId === undefined) return
			event.preventDefault()
			focusTreeItem(firstId)
			return
		}

		if (key === "End") {
			const lastId = ids.at(-1)
			if (lastId === undefined) return
			event.preventDefault()
			focusTreeItem(lastId)
			return
		}

		const node = treeIndex().nodeById.get(id)
		if (!node) return

		const hasChildren = node.children.length > 0
		const expanded = hasChildren && expandedIds().has(id)
		const depth = treeIndex().depthById.get(id) ?? 0

		if (key === "ArrowRight") {
			if (!hasChildren) return
			event.preventDefault()

			if (!expanded) {
				toggleExpanded(id, depth, expanded)
				return
			}

			const firstChildId = node.children[0]?.id
			if (firstChildId === undefined) return
			focusTreeItem(firstChildId)
			return
		}

		if (key === "ArrowLeft") {
			event.preventDefault()

			if (expanded) {
				toggleExpanded(id, depth, expanded)
				return
			}

			const parentId = treeIndex().parentById.get(id)
			if (parentId === null || parentId === undefined) return
			focusTreeItem(parentId)
		}
	}

	const setActiveTreeItem = (id: number) => {
		setActiveTreeItemId(id)
	}

	return (
		<ExplorePageLayout
			title="Tag Tree"
			titleId={TREE_HEADING_ID}
			action={{ to: "/tag/new", label: "Create tag" }}
		>
			<Show
				when={!treeQuery.isLoading}
				fallback={<TagTreeSkeleton />}
			>
				<Show
					when={nodes().length > 0}
					fallback={
						<EmptyExplorePlaceholder
							title="No tags found"
							action={{ to: "/tag/new" }}
						/>
					}
				>
					<div class="p-3">
						<TagTreeList
							nodes={nodes()}
							depth={0}
							expandedIds={expandedIds}
							onToggle={toggleExpanded}
							activeId={resolvedActiveTreeItemId}
							setActiveId={setActiveTreeItem}
							onKeyDown={handleTreeKeyDown}
							itemRefs={treeItemRefs}
						/>
					</div>
				</Show>
			</Show>
		</ExplorePageLayout>
	)
}

type TagTreeListProps = {
	nodes: TagTreeNode[]
	depth: number
	expandedIds: () => Set<number>
	onToggle: (id: number, depth: number, expanded: boolean) => void
	activeId: () => number | null
	setActiveId: (id: number) => void
	onKeyDown: (id: number, event: KeyboardEvent) => void
	itemRefs: Map<number, HTMLLIElement>
}

type TagTreeNode = {
	id: number
	name: string
	type: Tag["type"]
	short_description: Tag["short_description"]
	children: TagTreeNode[]
}

function TagTreeList(props: TagTreeListProps) {
	const listRole = () => (props.depth === 0 ? "tree" : "group")
	const labelledBy = () => (props.depth === 0 ? TREE_HEADING_ID : undefined)

	return (
		<ul
			role={listRole()}
			aria-labelledby={labelledBy()}
			class="flex flex-col gap-1"
		>
			<For each={props.nodes}>
				{(node, idx) => (
					<TagTreeNode
						node={node}
						depth={props.depth}
						expandedIds={props.expandedIds}
						onToggle={props.onToggle}
						activeId={props.activeId}
						setActiveId={props.setActiveId}
						onKeyDown={props.onKeyDown}
						itemRefs={props.itemRefs}
						posInSet={idx() + 1}
						setSize={props.nodes.length}
					/>
				)}
			</For>
		</ul>
	)
}

type TagTreeNodeProps = {
	node: TagTreeNode
	depth: number
	expandedIds: () => Set<number>
	onToggle: (id: number, depth: number, expanded: boolean) => void
	activeId: () => number | null
	setActiveId: (id: number) => void
	onKeyDown: (id: number, event: KeyboardEvent) => void
	itemRefs: Map<number, HTMLLIElement>
	posInSet: number
	setSize: number
}

function TagTreeNode(props: TagTreeNodeProps) {
	const hasChildren = () => props.node.children.length > 0
	const isExpanded = () =>
		hasChildren() && props.expandedIds().has(props.node.id)
	const children = () => props.node.children
	const indentStyle = () => ({ "padding-left": `${props.depth * 16}px` })
	const toggleLabel = () => (isExpanded() ? "Collapse" : "Expand")
	const isActive = () => props.activeId() === props.node.id
	const tabIndex = () => (isActive() ? 0 : -1)
	const ariaExpanded = () => (hasChildren() ? isExpanded() : undefined)

	const toggleNode = () => {
		if (!hasChildren()) return
		props.onToggle(props.node.id, props.depth, isExpanded())
	}

	const handleFocusIn = () => {
		props.setActiveId(props.node.id)
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter" && event.target === event.currentTarget) {
			event.preventDefault()
			linkRef?.click()
			return
		}

		props.onKeyDown(props.node.id, event)
	}

	const setItemRef = (element: HTMLLIElement) => {
		props.itemRefs.set(props.node.id, element)
		onCleanup(() => {
			props.itemRefs.delete(props.node.id)
		})
	}

	let linkRef: HTMLAnchorElement | undefined
	const setLinkRef = (element: HTMLAnchorElement) => {
		linkRef = element
	}

	return (
		<li
			ref={(element) => setItemRef(element)}
			role="treeitem"
			tabIndex={tabIndex()}
			aria-level={props.depth + 1}
			aria-posinset={props.posInSet}
			aria-setsize={props.setSize}
			aria-expanded={ariaExpanded()}
			onFocusIn={handleFocusIn}
			onKeyDown={handleKeyDown}
			class="group focus:outline-none"
		>
			<div
				class="hover:bg-slate-50 flex items-center gap-2 rounded px-2 py-1 group-focus-within:ring-2 group-focus-within:ring-slate-300 group-focus-within:ring-offset-1"
				style={indentStyle()}
			>
				<Show
					when={hasChildren()}
					fallback={<span class="inline-flex h-5 w-5"></span>}
				>
					<button
						type="button"
						class="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
						aria-label={toggleLabel()}
						aria-expanded={isExpanded()}
						tabIndex={-1}
						onClick={toggleNode}
					>
						<Show
							when={isExpanded()}
							fallback={">"}
						>
							v
						</Show>
					</button>
				</Show>
				<div class="flex flex-col">
					<Link
						ref={setLinkRef}
						to="/tag/$id"
						params={{ id: props.node.id.toString() }}
						class="text-sm text-slate-900 no-underline hover:underline"
						tabIndex={-1}
					>
						{props.node.name}
					</Link>
					<div class="flex flex-col text-xs text-slate-500">
						<span>{props.node.type}</span>
						<Show when={props.node.short_description}>
							<span class="text-slate-400">{props.node.short_description}</span>
						</Show>
					</div>
				</div>
			</div>
			<Show when={isExpanded()}>
				<div class="mt-1">
					<TagTreeList
						nodes={children()}
						depth={props.depth + 1}
						expandedIds={props.expandedIds}
						onToggle={props.onToggle}
						activeId={props.activeId}
						setActiveId={props.setActiveId}
						onKeyDown={props.onKeyDown}
						itemRefs={props.itemRefs}
					/>
				</div>
			</Show>
		</li>
	)
}

type TagTreeSkeletonItemProps = {
	depth: number
	width: number
}

function TagTreeSkeletonItem(props: TagTreeSkeletonItemProps) {
	const indentStyle = () => ({ "padding-left": `${props.depth * 16}px` })
	const mainStyle = () => ({ width: `${props.width}px` })
	const subWidth = () => Math.max(80, props.width - 48)
	const subStyle = () => ({ width: `${subWidth()}px` })

	return (
		<div
			class="flex items-start gap-2"
			style={indentStyle()}
		>
			<div class="mt-1 h-4 w-4 rounded bg-slate-200"></div>
			<div class="flex flex-col gap-2">
				<div
					class="h-4 rounded bg-slate-200"
					style={mainStyle()}
				></div>
				<div
					class="h-3 rounded bg-slate-100"
					style={subStyle()}
				></div>
			</div>
		</div>
	)
}

function TagTreeSkeleton() {
	const skeletonItems = [
		{ id: 0, depth: 0, width: 180 },
		{ id: 1, depth: 1, width: 220 },
		{ id: 2, depth: 2, width: 200 },
		{ id: 3, depth: 1, width: 240 },
		{ id: 4, depth: 2, width: 190 },
		{ id: 5, depth: 0, width: 210 },
		{ id: 6, depth: 1, width: 170 },
		{ id: 7, depth: 2, width: 230 },
	]

	return (
		<div class="animate-pulse p-3">
			<div class="flex flex-col gap-3">
				<For each={skeletonItems}>
					{(item) => (
						<TagTreeSkeletonItem
							depth={item.depth}
							width={item.width}
						/>
					)}
				</For>
			</div>
		</div>
	)
}

function collectExpandedIds(
	nodes: TagTreeNode[],
	maxDepth: number,
): Set<number> {
	const expanded = new Set<number>()
	const walk = (items: TagTreeNode[], depth: number) => {
		if (depth >= maxDepth) return
		for (const item of items) {
			if (item.children.length > 0) {
				expanded.add(item.id)
				walk(item.children, depth + 1)
			}
		}
	}
	walk(nodes, 0)
	return expanded
}

type TagTreeIndex = {
	nodeById: Map<number, TagTreeNode>
	parentById: Map<number, number | null>
	depthById: Map<number, number>
}

const buildTagTreeIndex = (roots: TagTreeNode[]): TagTreeIndex => {
	const nodeById = new Map<number, TagTreeNode>()
	const parentById = new Map<number, number | null>()
	const depthById = new Map<number, number>()

	const walk = (
		items: TagTreeNode[],
		parentId: number | null,
		depth: number,
	) => {
		for (const item of items) {
			nodeById.set(item.id, item)
			parentById.set(item.id, parentId)
			depthById.set(item.id, depth)
			walk(item.children, item.id, depth + 1)
		}
	}

	walk(roots, null, 0)

	return {
		nodeById,
		parentById,
		depthById,
	}
}

const collectVisibleNodeIds = (
	roots: TagTreeNode[],
	expandedIds: Set<number>,
): number[] => {
	const ids: number[] = []
	const walk = (items: TagTreeNode[]) => {
		for (const item of items) {
			ids.push(item.id)
			if (item.children.length > 0 && expandedIds.has(item.id)) {
				walk(item.children)
			}
		}
	}

	walk(roots)
	return ids
}

const resolveActiveTreeId = (
	activeId: number | null,
	visibleIds: readonly number[],
	visibleIdSet: ReadonlySet<number>,
	parentById: ReadonlyMap<number, number | null>,
): number | null => {
	const fallbackId = visibleIds[0] ?? null
	if (fallbackId === null) return null
	if (activeId === null) return fallbackId
	if (visibleIdSet.has(activeId)) return activeId

	let currentId = activeId
	for (;;) {
		const parentId = parentById.get(currentId)
		if (parentId == null) break
		if (visibleIdSet.has(parentId)) return parentId
		currentId = parentId
	}

	return fallbackId
}
