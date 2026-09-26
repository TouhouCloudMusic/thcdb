import { createEffect, createSignal, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"

export type RelationKind = "parents" | "children"

export type RegisterRelationAnchor = (
	kind: RelationKind,
	element: HTMLSpanElement,
) => void

type Point = { x: number; y: number }
type ConnectionLine = readonly [Point, Point, ...Point[]]
type RelationAnchor = { kind: RelationKind; element: HTMLSpanElement }

function measureAnchor(element: Element, containerBounds: DOMRect): Point {
	const bounds = element.getBoundingClientRect()
	return {
		x: bounds.left + bounds.width / 2 - containerBounds.left,
		y: bounds.top + bounds.height / 2 - containerBounds.top,
	}
}

function measureAnchors(elements: Iterable<Element>, containerBounds: DOMRect) {
	return Array.from(elements, (element) =>
		measureAnchor(element, containerBounds),
	).toSorted((left, right) => left.y - right.y)
}

function buildConnectionLines(
	container: HTMLElement,
	currentAnchor: HTMLSpanElement,
	parentAnchors: Iterable<HTMLSpanElement>,
	childAnchors: Iterable<HTMLSpanElement>,
): ConnectionLine[] {
	const containerBounds = container.getBoundingClientRect()
	const current = measureAnchor(currentAnchor, containerBounds)
	const parents = measureAnchors(parentAnchors, containerBounds)
	const children = measureAnchors(childAnchors, containerBounds)
	const lines: ConnectionLine[] = []

	const firstParent = parents[0]
	if (firstParent) {
		lines.push([firstParent, { x: firstParent.x, y: current.y }, current])
		for (const parent of parents) {
			lines.push([{ x: firstParent.x, y: parent.y }, parent])
		}
	}

	const lastChild = children.at(-1)
	if (lastChild) {
		lines.push([current, { x: current.x, y: lastChild.y }])
		for (const child of children) {
			lines.push([{ x: current.x, y: child.y }, child])
		}
	}

	return lines
}

export function createRelationConnections(
	container: Accessor<HTMLElement | undefined>,
	currentAnchor: Accessor<HTMLSpanElement | undefined>,
) {
	const [lines, setLines] = createSignal<ConnectionLine[]>([])
	const [anchors, setAnchors] = createSignal<RelationAnchor[]>([])

	const registerAnchor: RegisterRelationAnchor = (kind, element) => {
		const anchor = { kind, element }
		setAnchors((current) => [...current, anchor])
		onCleanup(() => {
			setAnchors((current) => current.filter((item) => item !== anchor))
		})
	}

	createEffect(() => {
		const tree = container()
		const current = currentAnchor()
		const visibleAnchors = anchors()
		if (!tree || !current) return

		const parents = visibleAnchors
			.filter((anchor) => anchor.kind === "parents")
			.map((anchor) => anchor.element)
		const children = visibleAnchors
			.filter((anchor) => anchor.kind === "children")
			.map((anchor) => anchor.element)
		const observer = new ResizeObserver(() => {
			setLines(buildConnectionLines(tree, current, parents, children))
		})
		observer.observe(tree)
		observer.observe(current)
		for (const anchor of visibleAnchors) {
			observer.observe(anchor.element)
		}
		onCleanup(() => observer.disconnect())
	})

	return { lines, registerAnchor }
}
