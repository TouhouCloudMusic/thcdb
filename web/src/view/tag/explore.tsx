import { useQuery } from "@tanstack/solid-query"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { PageLayout } from "~/layout"
import { createMockTagTree } from "~/mock/tag"
import type { TagTreeNode } from "~/mock/tag"

const DEFAULT_DEPTH = 2
const ROOT_COUNT = 6
const MAX_DEPTH = 4
const MOCK_DELAY_RANGE_MS = [200, 600]
const TREE_HEADING_ID = "tag-tree-title"

let sleep = (ms: number) => {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

let mockDelayMs = () => {
	let min = MOCK_DELAY_RANGE_MS[0] ?? 0
	let max = MOCK_DELAY_RANGE_MS[1] ?? min
	let span = Math.max(0, max - min)
	return min + Math.floor(Math.random() * (span + 1))
}

export function TagExplore() {
	let [expandedIdsOverride, setExpandedIdsOverride] =
		createSignal<Set<number> | null>(null)
	let [activeTreeItemId, setActiveTreeItemId] = createSignal<number | null>(
		null,
	)
	const treeItemRefs = new Map<number, HTMLLIElement>()

	let queryOptions = () => ({
		queryKey: ["tag::tree", ROOT_COUNT, MAX_DEPTH, DEFAULT_DEPTH],
		queryFn: async () => {
			await sleep(mockDelayMs())
			return createMockTagTree({
				rootCount: ROOT_COUNT,
				maxDepth: MAX_DEPTH,
				childCountRange: [1, 3],
			})
		},
	})

	let treeQuery = useQuery(queryOptions)
	let nodes = () => treeQuery.data ?? []
	let seededExpandedIds = createMemo(() =>
		collectExpandedIds(nodes(), DEFAULT_DEPTH),
	)
	let expandedIds = createMemo(
		() => expandedIdsOverride() ?? seededExpandedIds(),
	)
	let treeIndex = createMemo(() => buildTagTreeIndex(nodes()))
	let visibleIds = createMemo(() =>
		collectVisibleNodeIds(nodes(), expandedIds()),
	)
	let visibleIdSet = createMemo(() => new Set(visibleIds()))
	let resolvedActiveTreeItemId = createMemo(() =>
		resolveActiveTreeId(
			activeTreeItemId(),
			visibleIds(),
			visibleIdSet(),
			treeIndex().parentById,
		),
	)

	let toggleExpanded = (id: number, depth: number, expanded: boolean) => {
		setExpandedIdsOverride((prev) => {
			let base = prev ?? seededExpandedIds()

			if (0 === depth && expanded) {
				return new Set<number>()
			}

			let next = new Set(base)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	let focusTreeItem = (id: number) => {
		setActiveTreeItemId(id)
		queueMicrotask(() => {
			treeItemRefs.get(id)?.focus()
		})
	}

	let handleTreeKeyDown = (id: number, event: KeyboardEvent) => {
		let key = event.key
		let ids = visibleIds()
		let currentIndex = ids.indexOf(id)

		if ("ArrowDown" === key) {
			if (currentIndex < 0 || currentIndex >= ids.length - 1) return
			event.preventDefault()
			let nextId = ids[currentIndex + 1]
			if (undefined === nextId) return
			focusTreeItem(nextId)
			return
		}

		if ("ArrowUp" === key) {
			if (currentIndex <= 0) return
			event.preventDefault()
			let prevId = ids[currentIndex - 1]
			if (undefined === prevId) return
			focusTreeItem(prevId)
			return
		}

		if ("Home" === key) {
			let firstId = ids[0]
			if (undefined === firstId) return
			event.preventDefault()
			focusTreeItem(firstId)
			return
		}

		if ("End" === key) {
			let lastId = ids[ids.length - 1]
			if (undefined === lastId) return
			event.preventDefault()
			focusTreeItem(lastId)
			return
		}

		let node = treeIndex().nodeById.get(id)
		if (!node) return

		let hasChildren = node.children.length > 0
		let expanded = hasChildren && expandedIds().has(id)
		let depth = treeIndex().depthById.get(id) ?? 0

		if ("ArrowRight" === key) {
			if (!hasChildren) return
			event.preventDefault()

			if (!expanded) {
				toggleExpanded(id, depth, expanded)
				return
			}

			let firstChildId = node.children[0]?.id
			if (undefined === firstChildId) return
			focusTreeItem(firstChildId)
			return
		}

		if ("ArrowLeft" === key) {
			event.preventDefault()

			if (expanded) {
				toggleExpanded(id, depth, expanded)
				return
			}

			let parentId = treeIndex().parentById.get(id)
			if (null == parentId) return
			focusTreeItem(parentId)
		}
	}

	let setActiveTreeItem = (id: number) => {
		setActiveTreeItemId(id)
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1
					id={TREE_HEADING_ID}
					class="text-2xl font-light tracking-tight text-slate-900"
				>
					Tag Tree
				</h1>
				<Show
					when={!treeQuery.isLoading}
					fallback={<TagTreeSkeleton />}
				>
					<Show
						when={nodes().length > 0}
						fallback={<div class="text-sm text-tertiary">No tags</div>}
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
			</div>
		</PageLayout>
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

function TagTreeList(props: TagTreeListProps) {
	let listRole = () => (0 === props.depth ? "tree" : "group")
	let labelledBy = () => (0 === props.depth ? TREE_HEADING_ID : undefined)

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
	let hasChildren = () => props.node.children.length > 0
	let isExpanded = () => hasChildren() && props.expandedIds().has(props.node.id)
	let children = () => props.node.children
	let indentStyle = () => ({ "padding-left": `${props.depth * 16}px` })
	let toggleLabel = () => (isExpanded() ? "Collapse" : "Expand")
	let isActive = () => props.activeId() === props.node.id
	let tabIndex = () => (isActive() ? 0 : -1)
	let ariaExpanded = () => (hasChildren() ? isExpanded() : undefined)

	let toggleNode = () => {
		if (!hasChildren()) return
		props.onToggle(props.node.id, props.depth, isExpanded())
	}

	let handleFocusIn = () => {
		props.setActiveId(props.node.id)
	}

	let handleKeyDown = (event: KeyboardEvent) => {
		if ("Enter" === event.key && event.target === event.currentTarget) {
			event.preventDefault()
			linkRef?.click()
			return
		}

		props.onKeyDown(props.node.id, event)
	}

	let setItemRef = (element: HTMLLIElement) => {
		props.itemRefs.set(props.node.id, element)
		onCleanup(() => {
			props.itemRefs.delete(props.node.id)
		})
	}

	let linkRef: HTMLAnchorElement | undefined
	let setLinkRef = (element: HTMLAnchorElement) => {
		linkRef = element
	}

	return (
		<li
			ref={setItemRef}
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
					fallback={<span class="inline-flex h-5 w-5" />}
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
	let indentStyle = () => ({ "padding-left": `${props.depth * 16}px` })
	let mainStyle = () => ({ width: `${props.width}px` })
	let subWidth = () => Math.max(80, props.width - 48)
	let subStyle = () => ({ width: `${subWidth()}px` })

	return (
		<div
			class="flex items-start gap-2"
			style={indentStyle()}
		>
			<div class="mt-1 h-4 w-4 rounded bg-slate-200" />
			<div class="flex flex-col gap-2">
				<div
					class="h-4 rounded bg-slate-200"
					style={mainStyle()}
				/>
				<div
					class="h-3 rounded bg-slate-100"
					style={subStyle()}
				/>
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
	let walk = (items: TagTreeNode[], depth: number) => {
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

let buildTagTreeIndex = (roots: TagTreeNode[]): TagTreeIndex => {
	const nodeById = new Map<number, TagTreeNode>()
	const parentById = new Map<number, number | null>()
	const depthById = new Map<number, number>()

	let walk = (items: TagTreeNode[], parentId: number | null, depth: number) => {
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

let collectVisibleNodeIds = (
	roots: TagTreeNode[],
	expandedIds: Set<number>,
): number[] => {
	const ids: number[] = []
	let walk = (items: TagTreeNode[]) => {
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

let resolveActiveTreeId = (
	activeId: number | null,
	visibleIds: readonly number[],
	visibleIdSet: ReadonlySet<number>,
	parentById: ReadonlyMap<number, number | null>,
): number | null => {
	let fallbackId = visibleIds[0] ?? null
	if (null == fallbackId) return null
	if (null == activeId) return fallbackId
	if (visibleIdSet.has(activeId)) return activeId

	let currentId = activeId
	while (true) {
		let parentId = parentById.get(currentId)
		if (null == parentId) break
		if (visibleIdSet.has(parentId)) return parentId
		currentId = parentId
	}

	return fallbackId
}
