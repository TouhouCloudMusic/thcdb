import { onMount } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryRouter } from "~/utils/adapter/storybook"
import { logImage } from "~/utils/log"
import type { EntityImageUploadPageProps } from "~/view/image_upload/EntityImageUploadPage"
import {
	createEntityImageUploadStore,
	EntityImageUploadPage,
} from "~/view/image_upload/EntityImageUploadPage"

type StoryRootProps = Omit<EntityImageUploadPageProps, "store"> & {
	onUpload: (file: File) => Promise<void>
}

const DIFF_PREVIEW_FILE = new File(
	[
		`
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
				<rect width="640" height="640" fill="#f4efe6"/>
				<circle cx="320" cy="248" r="148" fill="#d7263d"/>
				<rect x="140" y="392" width="360" height="110" rx="20" fill="#1f2937"/>
				<rect x="182" y="430" width="276" height="18" rx="9" fill="#f4efe6"/>
			</svg>
		`,
	],
	"diff-preview.svg",
	{ type: "image/svg+xml" },
)
const PENDING_UPLOAD = new Promise<void>((resolve) => {
	void resolve
})

async function fileToDataUrl(file: File) {
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()

		reader.addEventListener("load", () => {
			const result = reader.result
			if (typeof result === "string") {
				resolve(result)
				return
			}

			reject(new Error("Failed to read image."))
		})

		reader.addEventListener("error", () => {
			reject(reader.error ?? new Error("Failed to read image."))
		})

		reader.readAsDataURL(file)
	})

	return dataUrl
}

function StoryRoot(props: StoryRootProps) {
	const store = createEntityImageUploadStore({
		onUpload: (file) => props.onUpload(file),
	})

	return (
		<EntityImageUploadPage
			entityLabel={props.entityLabel}
			entityId={props.entityId}
			entityName={props.entityName}
			imageLabel={props.imageLabel}
			imageUrl={props.imageUrl}
			dimensionRange={props.dimensionRange}
			fileSizeRange={props.fileSizeRange}
			store={store}
		/>
	)
}

function DiffStoryRoot(props: Omit<EntityImageUploadPageProps, "store">) {
	const store = createEntityImageUploadStore({
		onUpload: onUploadStoryStub,
		initialDraftFile: DIFF_PREVIEW_FILE,
	})

	return (
		<EntityImageUploadPage
			entityLabel={props.entityLabel}
			entityId={props.entityId}
			entityName={props.entityName}
			imageLabel={props.imageLabel}
			imageUrl={props.imageUrl}
			dimensionRange={props.dimensionRange}
			fileSizeRange={props.fileSizeRange}
			store={store}
		/>
	)
}

function UploadingStoryRoot(props: Omit<EntityImageUploadPageProps, "store">) {
	const store = createEntityImageUploadStore({
		onUpload: onUploadPendingStoryStub,
		initialDraftFile: DIFF_PREVIEW_FILE,
	})

	onMount(() => {
		void store.onSubmit()
	})

	return (
		<EntityImageUploadPage
			entityLabel={props.entityLabel}
			entityId={props.entityId}
			entityName={props.entityName}
			imageLabel={props.imageLabel}
			imageUrl={props.imageUrl}
			dimensionRange={props.dimensionRange}
			fileSizeRange={props.fileSizeRange}
			store={store}
		/>
	)
}

async function onUploadStoryStub(file: File) {
	logImage(await fileToDataUrl(file))
}

async function onUploadPendingStoryStub() {
	await PENDING_UPLOAD
}

const meta = {
	title: "Page/EntityImageUploadPage",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		entityLabel: {
			control: { type: "select" },
			options: ["Artist", "Release"],
		},
		entityId: { control: { type: "text" } },
		entityName: { control: { type: "text" } },
		imageLabel: { control: { type: "text" } },
		imageUrl: { control: { type: "text" } },
		dimensionRange: { control: { type: "object" } },
		fileSizeRange: { control: { type: "object" } },
		onUpload: { control: false },
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>

export const ReleaseCover: Story = {
	args: {
		entityLabel: "Release",
		entityId: "1",
		entityName: "Bad Apple!! (Touhou Arrange)",
		imageLabel: "cover art",
		imageUrl: "/img/cover/release/1.png",
		dimensionRange: {
			width: { min: 512, max: 2048 },
			height: { min: 512, max: 2048 },
		},
		fileSizeRange: {
			min: 10 * 1024,
			max: 2 * 1024 * 1024,
		},
		onUpload: onUploadStoryStub,
	},
}

export const ArtistProfile: Story = {
	args: {
		entityLabel: "Artist",
		entityId: "1",
		entityName: "Hakurei Reimu",
		imageLabel: "profile image",
		imageUrl: "/img/logo.png",
		dimensionRange: {
			width: { min: 320, max: 1600 },
			height: { min: 320, max: 1600 },
		},
		fileSizeRange: {
			min: 10 * 1024,
			max: 2 * 1024 * 1024,
		},
		onUpload: onUploadStoryStub,
	},
}

export const NoImage: Story = {
	args: {
		entityLabel: "Release",
		entityId: "1",
		entityName: "Untitled Release With A Very, Very Long Name To Stress Layout",
		imageLabel: "cover art",
		imageUrl: null,
		dimensionRange: {
			width: { min: 512, max: 2048 },
			height: { min: 512, max: 2048 },
		},
		fileSizeRange: {
			min: 10 * 1024,
			max: 2 * 1024 * 1024,
		},
		onUpload: onUploadStoryStub,
	},
}

export const Uploading: Story = {
	args: {
		entityLabel: "Artist",
		entityId: "1",
		entityName: "Upload State",
		imageLabel: "profile image",
		imageUrl: "/img/logo.png",
		dimensionRange: {
			width: { min: 320, max: 1600 },
			height: { min: 320, max: 1600 },
		},
		fileSizeRange: {
			min: 10 * 1024,
			max: 2 * 1024 * 1024,
		},
		onUpload: onUploadStoryStub,
	},
	render: (args: StoryRootProps) => (
		<UploadingStoryRoot
			entityLabel={args.entityLabel}
			entityId={args.entityId}
			entityName={args.entityName}
			imageLabel={args.imageLabel}
			imageUrl={args.imageUrl}
			dimensionRange={args.dimensionRange}
			fileSizeRange={args.fileSizeRange}
		/>
	),
}

const DIFF_PREVIEW_ARGS: StoryRootProps = {
	entityLabel: "Release",
	entityId: "1",
	entityName: "Bad Apple!! (Touhou Arrange)",
	imageLabel: "cover art",
	imageUrl: "/img/cover/release/1.png",
	dimensionRange: {
		width: { min: 512, max: 2048 },
		height: { min: 512, max: 2048 },
	},
	fileSizeRange: {
		min: 10 * 1024,
		max: 2 * 1024 * 1024,
	},
	onUpload: onUploadStoryStub,
}

export const DiffPreview: Story = {
	args: DIFF_PREVIEW_ARGS,
	render: (args: StoryRootProps) => (
		<DiffStoryRoot
			entityLabel={args.entityLabel}
			entityId={args.entityId}
			entityName={args.entityName}
			imageLabel={args.imageLabel}
			imageUrl={args.imageUrl}
			dimensionRange={args.dimensionRange}
			fileSizeRange={args.fileSizeRange}
		/>
	),
}
