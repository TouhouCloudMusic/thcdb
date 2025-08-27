import { Dialog as K_Dialog } from "@kobalte/core"
import { FileField } from "@kobalte/core/file-field"
import { createForm, valiForm } from "@modular-forms/solid"
import { Option } from "effect"
import { Cropper } from "solid-cropper"
import type { Setter, ValidComponent } from "solid-js"
import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { createMutable } from "solid-js/store"
import * as v from "valibot"

import { Card } from "~/components/atomic/Card"
import { Avatar } from "~/components/atomic/avatar"
import { Button } from "~/components/atomic/button"
import { Dialog } from "~/components/dialog"
import { PageLayout } from "~/layout/PageLayout"
import { useCurrentUser } from "~/state/user"
import { createClickOutside } from "~/utils/solid/createClickOutside"

export function EditProfile() {
	let user_ctx = useCurrentUser()

	let user = createMutable(user_ctx.user!)

	return (
		<PageLayout>
			<div class="col-span-22 col-start-2 grid grid-cols-[1fr_auto] pt-6">
				<div>
					<div>{user.name}</div>
					{/* TODO: locales */}
					<div>{new Date(user.last_login).toLocaleString("zh-CN")}</div>
					<div>
						{Option.fromNullable(user.roles)
							.pipe(Option.map((x) => x.map((y) => y.name).join(", ")))
							.pipe(Option.getOrUndefined)}
					</div>
				</div>
				<div>
					<Avatar
						user={user_ctx.user}
						class="size-48"
					/>
					<UploadAvatarFormDialog />
				</div>
			</div>
		</PageLayout>
	)
}

const UploadAvatarFormSchema = v.object({
	data: v.file(),
})

function UploadAvatarFormDialog() {
	let [_, __] = createForm({
		validate: valiForm(UploadAvatarFormSchema),
	})
	let [show, setShow, ref] = createClickOutside()
	let close = () => setShow(false)
	setShow(true)
	return (
		<>
			<div class="mt-8 flex">
				<Button
					class="mx-auto"
					variant="Primary"
					onClick={() => setShow(!show())}
				>
					Upload
				</Button>
			</div>
			<Dialog.Root
				open={show()}
				onOpenChange={close}
			>
				<Dialog.Portal>
					<Dialog.Overlay onClick={close} />
					<K_Dialog.Content class="fixed inset-0 z-51 m-auto size-fit">
						<UploadAvatarFormContent ref={ref} />
					</K_Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	)
}

export function UploadAvatarFormContent(props: {
	ref: Setter<HTMLElement | undefined>
}) {
	// @tw
	const DROP_ZONE_CLASS = `
    flex size-88 border-dashed border-2 border-slate-400
    rounded-md
  `

	let [_, { Form, Field }] = createForm({
		validate: valiForm(UploadAvatarFormSchema),
	})

	let [showDragZone, setShowDragZone] = createSignal(true)

	return (
		<Card
			ref={props.ref}
			class="h-128 w-96"
		>
			<Form class="size-full">
				<FileField
					class="flex size-full flex-col"
					multiple={false}
					onFileChange={(details) => {
						setShowDragZone(!(details.acceptedFiles.length > 0))
					}}
				>
					<FileField.Label class="text-center text-lg font-medium">
						Upload Avatar
					</FileField.Label>
					<Show
						when={showDragZone()}
						fallback={
							<>
								<FileField.ItemList>
									{(file) => (
										<FileField.Item class="size-full">
											<FileField.ItemPreview
												type="image/*"
												class="size-full"
											>
												<UploadAvatarFormCanvas file={file} />
											</FileField.ItemPreview>

											<FileField.ItemDeleteTrigger
												variant="Primary"
												color="Reimu"
												size="Md"
												as={Button}
											>
												Delete
											</FileField.ItemDeleteTrigger>
										</FileField.Item>
									)}
								</FileField.ItemList>
								<Button
									type="submit"
									variant="Primary"
									class="self-center"
								>
									Submit
								</Button>
							</>
						}
					>
						<FileField.Dropzone class={DROP_ZONE_CLASS}>
							<FileField.Trigger
								as={
									(
										<Button
											variant="Primary"
											color="Reimu"
											size="Md"
											class="m-auto"
										>
											Select File
										</Button>
									) as ValidComponent
								}
							/>
						</FileField.Dropzone>
					</Show>
					<Field
						name="data"
						type="File"
					>
						{(field, props) => (
							<>
								<FileField.HiddenInput {...props} />
								<FileField.ErrorMessage>{field.error}</FileField.ErrorMessage>
							</>
						)}
					</Field>
				</FileField>
			</Form>
		</Card>
	)
}

function UploadAvatarFormCanvas(props: { file: File }) {
	let url = createMemo(() => {
		let url = globalThis.URL.createObjectURL(props.file)

		onCleanup(() => globalThis.URL.revokeObjectURL(url))

		return url
	})

	// let store = createCropperBoundary("image")

	return (
		<Cropper.Canvas
			background
			class="size-88"
			// ref={store.setCanvasRef}
		>
			<Cropper.Image
				src={url()}
				alt="TODO"
				scalable
				rotatable
				translatable
				skewable
				// ref={store.setImageRef}
			/>
			<Cropper.Shade hidden />

			<Cropper.Selection
				aspect-ratio={1}
				initial-coverage={0.75}
				keyboard
				precise
				// dynamic
				// ref={store.setSelectionRef}
			>
				<Cropper.Handle
					action="move"
					plain
				/>
			</Cropper.Selection>
		</Cropper.Canvas>
	)
}
