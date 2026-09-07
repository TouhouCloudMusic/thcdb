import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	treeList: { display: "flex", flexDirection: "column", gap: px[4] },
	treeItem: { outlineStyle: { default: null, ":focus": "none" } },
	nodeRow: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.sm,
		paddingInline: px[8],
		paddingBlock: px[4],
		boxShadow: {
			default: null,
			[stylex.when.ancestor(":focus-within")]:
				`0 0 0 1px #fff, 0 0 0 3px ${palette.slate[300]}`,
		},
	},
	togglePlaceholder: {
		display: "inline-flex",
		height: px[20],
		width: px[20],
	},
	toggle: {
		display: "inline-flex",
		height: px[20],
		width: px[20],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.sm,
		color: {
			default: palette.slate[500],
			":hover": { default: null, "@media (hover: hover)": palette.slate[900] },
		},
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
		},
	},
	nodeText: { display: "flex", flexDirection: "column" },
	nodeLink: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[900],
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	nodeDetails: {
		display: "flex",
		flexDirection: "column",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	nodeDescription: { color: palette.slate[400] },
	children: { marginTop: px[4] },
})

const DEFAULT_EXPANDED_DEPTH = 2
const INDENT_SIZE = 16

export type TagTreeNode = {
	id: number
	name: string
	type: Tag["type"]
	short_description: Tag["short_description"]
	children: TagTreeNode[]
}

type TagTreeProps = {
	nodes: TagTreeNode[]
	headingId?: string
}

export function TagTree(props: TagTreeProps) {
	const [expandedIdsOverride, setExpandedIdsOverride] =
		createSignal<Set<number> | null>(null)
	const [activeTreeItemId, setActiveTreeItemId] = createSignal<number | null>(
		null,
	)
	const treeItemRefs = new Map<number, HTMLLIElement>()

	const seededExpandedIds = createMemo(() =>
		collectExpandedIds(props.nodes, DEFAULT_EXPANDED_DEPTH),
	)
	const expandedIds = createMemo(
		() => expandedIdsOverride() ?? seededExpandedIds(),
	)
	const treeIndex = createMemo(() => buildTagTreeIndex(props.nodes))
	const visibleIds = createMemo(() =>
		collectVisibleNodeIds(props.nodes, expandedIds()),
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

	function toggleExpanded(id: number, depth: number, expanded: boolean) {
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

	function focusTreeItem(id: number) {
		setActiveTreeItemId(id)
		queueMicrotask(() => {
			treeItemRefs.get(id)?.focus()
		})
	}

	function focusRelativeItem(currentIndex: number, offset: number) {
		const targetId = visibleIds()[currentIndex + offset]
		if (targetId === undefined) return
		focusTreeItem(targetId)
	}

	function focusBoundaryItem(boundary: "first" | "last") {
		const targetId =
			boundary === "first" ? visibleIds()[0] : visibleIds().at(-1)
		if (targetId === undefined) return
		focusTreeItem(targetId)
	}

	function handleHorizontalKey(id: number, event: KeyboardEvent) {
		const node = treeIndex().nodeById.get(id)
		if (!node) return

		const hasChildren = node.children.length > 0
		const expanded = hasChildren && expandedIds().has(id)
		const depth = treeIndex().depthById.get(id) ?? 0

		if (event.key === "ArrowRight") {
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

		if (event.key !== "ArrowLeft") return

		event.preventDefault()

		if (expanded) {
			toggleExpanded(id, depth, expanded)
			return
		}

		const parentId = treeIndex().parentById.get(id)
		if (parentId == null) return
		focusTreeItem(parentId)
	}

	function handleTreeKeyDown(id: number, event: KeyboardEvent) {
		const ids = visibleIds()
		const currentIndex = ids.indexOf(id)

		switch (event.key) {
			case "ArrowDown": {
				if (currentIndex === -1 || currentIndex >= ids.length - 1) return
				event.preventDefault()
				focusRelativeItem(currentIndex, 1)
				return
			}
			case "ArrowUp": {
				if (currentIndex <= 0) return
				event.preventDefault()
				focusRelativeItem(currentIndex, -1)
				return
			}
			case "Home": {
				event.preventDefault()
				focusBoundaryItem("first")
				return
			}
			case "End": {
				event.preventDefault()
				focusBoundaryItem("last")
				return
			}
			case "ArrowRight":
			case "ArrowLeft": {
				handleHorizontalKey(id, event)
			}
		}
	}

	function setActiveTreeItem(id: number) {
		setActiveTreeItemId(id)
	}

	return (
		<TagTreeList
			nodes={props.nodes}
			depth={0}
			headingId={props.headingId}
			expandedIds={expandedIds}
			onToggle={toggleExpanded}
			activeId={resolvedActiveTreeItemId}
			setActiveId={setActiveTreeItem}
			onKeyDown={handleTreeKeyDown}
			itemRefs={treeItemRefs}
		/>
	)
}

type TagTreeListProps = {
	nodes: TagTreeNode[]
	depth: number
	headingId?: string
	expandedIds: () => Set<number>
	onToggle: (id: number, depth: number, expanded: boolean) => void
	activeId: () => number | null
	setActiveId: (id: number) => void
	onKeyDown: (id: number, event: KeyboardEvent) => void
	itemRefs: Map<number, HTMLLIElement>
}

function TagTreeList(props: TagTreeListProps) {
	const listRole = () => (props.depth === 0 ? "tree" : "group")
	const labelledBy = () => (props.depth === 0 ? props.headingId : undefined)

	return (
		<ul
			role={listRole()}
			aria-labelledby={labelledBy()}
			{...stylex.attrs(styles.treeList)}
		>
			<For each={props.nodes}>
				{(node, idx) => (
					<TagTreeItem
						node={node}
						depth={props.depth}
						headingId={props.headingId}
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

type TagTreeItemProps = {
	node: TagTreeNode
	depth: number
	headingId?: string
	expandedIds: () => Set<number>
	onToggle: (id: number, depth: number, expanded: boolean) => void
	activeId: () => number | null
	setActiveId: (id: number) => void
	onKeyDown: (id: number, event: KeyboardEvent) => void
	itemRefs: Map<number, HTMLLIElement>
	posInSet: number
	setSize: number
}

function TagTreeItem(props: TagTreeItemProps) {
	const { t } = useLingui()
	const hasChildren = () => props.node.children.length > 0
	const isExpanded = () =>
		hasChildren() && props.expandedIds().has(props.node.id)
	const indentStyle = () => ({
		"padding-left": `${props.depth * INDENT_SIZE}px`,
	})
	const toggleLabel = () => (isExpanded() ? t`Collapse` : t`Expand`)
	const isActive = () => props.activeId() === props.node.id
	const tabIndex = () => (isActive() ? 0 : -1)
	const ariaExpanded = () => (hasChildren() ? isExpanded() : undefined)

	function toggleNode() {
		if (!hasChildren()) return
		props.onToggle(props.node.id, props.depth, isExpanded())
	}

	function handleFocusIn() {
		props.setActiveId(props.node.id)
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter" && event.target === event.currentTarget) {
			event.preventDefault()
			linkRef?.click()
			return
		}

		props.onKeyDown(props.node.id, event)
	}

	function setItemRef(element: HTMLLIElement) {
		props.itemRefs.set(props.node.id, element)
		onCleanup(() => {
			props.itemRefs.delete(props.node.id)
		})
	}

	let linkRef: HTMLAnchorElement | undefined
	function setLinkRef(element: HTMLAnchorElement) {
		linkRef = element
	}

	return (
		<li
			ref={(element) => setItemRef(element)}
			role="treeitem"
			tabIndex={tabIndex()}
			aria-label={props.node.name}
			aria-level={props.depth + 1}
			aria-posinset={props.posInSet}
			aria-setsize={props.setSize}
			aria-expanded={ariaExpanded()}
			onFocusIn={handleFocusIn}
			onKeyDown={handleKeyDown}
			{...stylex.attrs(stylex.defaultMarker(), styles.treeItem)}
		>
			<div
				{...stylex.attrs(styles.nodeRow)}
				style={indentStyle()}
			>
				<Show
					when={hasChildren()}
					fallback={<span {...stylex.attrs(styles.togglePlaceholder)}></span>}
				>
					<button
						type="button"
						{...stylex.attrs(styles.toggle)}
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
				<div {...stylex.attrs(styles.nodeText)}>
					<Link
						ref={setLinkRef}
						to="/tag/$id"
						params={{ id: props.node.id.toString() }}
						class={stylex.attrs(link.base, link.text, styles.nodeLink).class}
						tabIndex={-1}
					>
						{props.node.name}
					</Link>
					<div {...stylex.attrs(styles.nodeDetails)}>
						<span>{props.node.type}</span>
						<Show when={props.node.short_description}>
							<span {...stylex.attrs(styles.nodeDescription)}>
								{props.node.short_description}
							</span>
						</Show>
					</div>
				</div>
			</div>
			<Show when={isExpanded()}>
				<div {...stylex.attrs(styles.children)}>
					<TagTreeList
						nodes={props.node.children}
						depth={props.depth + 1}
						headingId={props.headingId}
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

function collectExpandedIds(
	nodes: TagTreeNode[],
	maxDepth: number,
): Set<number> {
	const expanded = new Set<number>()

	function walk(items: TagTreeNode[], depth: number) {
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

function buildTagTreeIndex(roots: TagTreeNode[]): TagTreeIndex {
	const nodeById = new Map<number, TagTreeNode>()
	const parentById = new Map<number, number | null>()
	const depthById = new Map<number, number>()

	function walk(items: TagTreeNode[], parentId: number | null, depth: number) {
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

function collectVisibleNodeIds(
	roots: TagTreeNode[],
	expandedIds: Set<number>,
): number[] {
	const ids: number[] = []

	function walk(items: TagTreeNode[]) {
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

function resolveActiveTreeId(
	activeId: number | null,
	visibleIds: readonly number[],
	visibleIdSet: ReadonlySet<number>,
	parentById: ReadonlyMap<number, number | null>,
): number | null {
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
