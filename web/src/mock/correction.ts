import type {
	Correction,
	CorrectionDiff,
	CorrectionDiffEntry,
	CorrectionHistoryItem,
	CorrectionRevisionSummary,
	CorrectionType,
	CorrectionUserSummary,
	EntityType,
} from "@thc/api"

export const MOCK_CORRECTION_ID = 104
export const MOCK_CORRECTION_ENTITY_ID = 24
export const MOCK_CORRECTION_ENTITY_TYPE: EntityType = "Artist"
export const MOCK_CORRECTION_HISTORY_ENTITY_TYPE = "artist"

function createMockUser(id: number, name: string): CorrectionUserSummary {
	return {
		id,
		name,
	}
}

function createMockHistoryItem(
	id: number,
	type: CorrectionType,
	createdAt: string,
	handledAt: string | null,
	description: string,
	author: CorrectionUserSummary,
): CorrectionHistoryItem {
	return {
		id,
		type,
		created_at: createdAt,
		handled_at: handledAt,
		description,
		author,
	}
}

function createDiffEntry(
	path: string,
	before: string | null,
	after: string | null,
): CorrectionDiffEntry {
	return {
		path,
		before,
		after,
	}
}

const AUTHOR_KAZE = createMockUser(7, "Kaze Ito")
const AUTHOR_RIN = createMockUser(12, "Rin Hoshino")
const AUTHOR_MIKA = createMockUser(19, "Mika Arisato")

export const MOCK_CORRECTION_DETAIL: Correction = {
	id: MOCK_CORRECTION_ID,
	status: "Pending",
	type: "Update",
	entity_type: MOCK_CORRECTION_ENTITY_TYPE,
	entity_id: MOCK_CORRECTION_ENTITY_ID,
	created_at: "2025-12-29T09:12:00+08:00",
	handled_at: null,
}

export const MOCK_CORRECTION_HISTORY: CorrectionHistoryItem[] = [
	createMockHistoryItem(
		104,
		"Update",
		"2025-12-29T09:12:00+08:00",
		null,
		"Refine localized names and add new aliases.",
		AUTHOR_KAZE,
	),
	createMockHistoryItem(
		98,
		"Update",
		"2025-12-12T16:45:00+08:00",
		"2025-12-14T11:03:00+08:00",
		"Normalize artist links and update profile image.",
		AUTHOR_RIN,
	),
	createMockHistoryItem(
		90,
		"Create",
		"2025-11-02T10:18:00+08:00",
		"2025-11-05T08:30:00+08:00",
		"Initial artist entry with basic metadata.",
		AUTHOR_MIKA,
	),
]

export const MOCK_CORRECTION_REVISIONS: CorrectionRevisionSummary[] = [
	{
		entity_history_id: 5012,
		author: AUTHOR_KAZE,
		description: "Added missing kana name and fixed typo in bio.",
	},
	{
		entity_history_id: 5011,
		author: AUTHOR_KAZE,
		description: "Synced website links with official sources.",
	},
	{
		entity_history_id: 5007,
		author: AUTHOR_RIN,
		description: "Updated profile image and cleaned aliases.",
	},
]

export const MOCK_CORRECTION_DIFF: CorrectionDiff = {
	entity_id: MOCK_CORRECTION_ENTITY_ID,
	entity_type: MOCK_CORRECTION_ENTITY_TYPE,
	base_correction_id: 98,
	base_history_id: 5011,
	target_correction_id: 104,
	target_history_id: 5012,
	changes: [
		createDiffEntry("name", "ZUN", "ZUN (Team Shanghai Alice)"),
		createDiffEntry("localized_names[ja]", "ZUN", "上海アリス幻樂団"),
		createDiffEntry(
			"links",
			'["https://example.com"]',
			'["https://example.com", "https://twitter.com/placeholder"]',
		),
		createDiffEntry("profile_image_url", "/avatar.png", "/artist/zun.png"),
	],
}

const MOCK_COMPARE_DIFF_98: CorrectionDiff = {
	entity_id: MOCK_CORRECTION_ENTITY_ID,
	entity_type: MOCK_CORRECTION_ENTITY_TYPE,
	base_correction_id: 98,
	base_history_id: 5011,
	target_correction_id: MOCK_CORRECTION_ID,
	target_history_id: 5012,
	changes: [
		createDiffEntry("name", "ZUN", "ZUN (Team Shanghai Alice)"),
		createDiffEntry("localized_names[ja]", "ZUN", "上海アリス幻樂団"),
	],
}

const MOCK_COMPARE_DIFF_90: CorrectionDiff = {
	entity_id: MOCK_CORRECTION_ENTITY_ID,
	entity_type: MOCK_CORRECTION_ENTITY_TYPE,
	base_correction_id: 90,
	base_history_id: 5002,
	target_correction_id: MOCK_CORRECTION_ID,
	target_history_id: 5012,
	changes: [
		createDiffEntry("name", null, "ZUN (Team Shanghai Alice)"),
		createDiffEntry("profile_image_url", null, "/artist/zun.png"),
		createDiffEntry(
			"links",
			null,
			'["https://example.com", "https://twitter.com/placeholder"]',
		),
	],
}

export const MOCK_CORRECTION_COMPARE: Record<number, CorrectionDiff> = {
	98: MOCK_COMPARE_DIFF_98,
	90: MOCK_COMPARE_DIFF_90,
}
