import { describe, expect, it } from "vitest"

import { createMockTagTree } from "~/mock/tag"
import type { TagTreeNode } from "~/mock/tag"

function getMaxDepth(nodes: TagTreeNode[]): number {
	let maxDepth = 0
	let walk = (items: TagTreeNode[], depth: number) => {
		if (depth > maxDepth) maxDepth = depth
		for (const item of items) {
			if (item.children.length > 0) {
				walk(item.children, depth + 1)
			}
		}
	}
	walk(nodes, 0)
	return maxDepth
}

let suite = () => {
	let testDepth = () => {
		const maxDepth = 2
		const tree = createMockTagTree({
			rootCount: 1,
			maxDepth,
			childCountRange: [1, 1],
			startId: 1,
		})

		expect(getMaxDepth(tree)).toBe(maxDepth)
	}

	let testRootCount = () => {
		const tree = createMockTagTree({
			rootCount: 3,
			maxDepth: 0,
			childCountRange: [0, 0],
			startId: 10,
		})

		expect(tree.length).toBe(3)
	}

	it("caps depth", testDepth)
	it("creates roots", testRootCount)
}

describe("createMockTagTree", suite)
