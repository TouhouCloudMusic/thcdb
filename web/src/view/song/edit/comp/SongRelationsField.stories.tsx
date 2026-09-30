import { createForm } from "@formisch/solid"
import * as stylex from "@stylexjs/stylex"
import type { SongRelation } from "@thc/api"
import { untrack } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { NewSongCorrection } from "~/domain/song"
import { TanStackProvider } from "~/state/tanstack"
import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { SongRelationsField } from "./SongRelationsField"

const styles = stylex.create({
	root: { width: "100%", maxWidth: px[640] },
})

function songRelation(definition: {
	id: number
	title: string
	direction: SongRelation["direction"]
	type: SongRelation["type"]
	description?: string
}): SongRelation {
	return {
		song: {
			id: definition.id,
			title: definition.title,
			artists: [],
			release: null,
		},
		direction: definition.direction,
		type: definition.type,
		description: definition.description ?? "",
	}
}

const DEFAULT_RELATIONS: SongRelation[] = [
	songRelation({
		id: 100,
		title: "Locked Girl",
		direction: "Derived",
		type: "Arrangement",
		description: "Primary melodic source.",
	}),
	songRelation({
		id: 101,
		title: "Shanghai Teahouse ~ Chinese Tea",
		direction: "Source",
		type: "Cover",
	}),
	songRelation({
		id: 101,
		title: "Shanghai Teahouse ~ Chinese Tea",
		direction: "Derived",
		type: "Remix",
		description: "Electronic remix released later.",
	}),
]

type StoryProps = {
	currentSongId: number
	relations: SongRelation[]
}

function StoryRoot(props: StoryProps) {
	const relations = untrack(() => props.relations)
	const form = createForm({
		schema: NewSongCorrection,
		initialInput: {
			type: "Update",
			description: "",
			data: {
				title: "U.N. Owen Was Her?",
				artists: [],
				languages: [],
				localized_titles: [],
				credits: [],
				relations: relations.map((relation) => ({
					related_song_id: relation.song.id,
					direction: relation.direction,
					relation_type: relation.type,
					description: relation.description,
				})),
				links: [],
			},
		},
	})
	return (
		<TanStackProvider>
			<div {...stylex.attrs(styles.root)}>
				<SongRelationsField
					of={form}
					currentSongId={props.currentSongId}
					initRelations={relations}
				/>
			</div>
		</TanStackProvider>
	)
}

const meta = {
	title: "View/Song/Edit/SongRelationsField",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		currentSongId: 10,
		relations: DEFAULT_RELATIONS,
	},
}
