import { Dialog as K_Dialog } from "@kobalte/core"
import { FileField } from "@kobalte/core/file-field"
import { createForm, valiForm } from "@modular-forms/solid"
import "cropperjs"
import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Match,
  onCleanup,
  type Setter,
  Show,
  Switch,
  type ValidComponent,
} from "solid-js"
import { createMutable, createStore } from "solid-js/store"
import * as v from "valibot"
import { Avatar } from "~/components/avatar"
import { Button } from "~/components/button"
import { Card } from "~/components/card"
import { Dialog } from "~/components/dialog"
import { PageLayout } from "~/components/layout/PageLayout"
import { type components } from "~/data/openapi"
import { useUserCtx } from "~/state/user"
import { type Replace } from "~/types"
import { type SatisfyValibotSchema as GenericValibotSchema } from "~/types/valibot"
import { createCropperBoundary } from "~/utils/adapter/cropper"
import { createClickOutside } from "~/utils/createClickOutside"

export function EditProfile() {
  let user_ctx = useUserCtx()

  let user = createMutable(user_ctx.user!)

  return (
    <PageLayout>
      <div class="col-span-22 col-start-2 grid grid-cols-[1fr_auto] pt-6">
        <div>
          <div>{user.name}</div>
          <div>{new Date(user.last_login).toLocaleString("zh-CN")}</div>
          <div>{user.roles.join(", ")}</div>
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

type UploadAvatarForm = Replace<
  components["schemas"]["UploadAvatar"],
  Blob,
  File
>

const UploadAvatarFormSchema = v.object({
  data: v.file(),
} satisfies GenericValibotSchema<UploadAvatarForm>)

function UploadAvatarFormDialog() {
  let [_, { Form, Field }] = createForm<UploadAvatarForm>({
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

  let [_, { Form, Field }] = createForm<UploadAvatarForm>({
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
    let url = window.URL.createObjectURL(props.file)

    onCleanup(() => window.URL.revokeObjectURL(url))

    return url
  })

  let store = createCropperBoundary("image")

  return (
    <cropper-canvas
      background
      class="size-88"
      ref={store.setCanvasRef}
    >
      <cropper-image
        src={url()}
        alt="TODO"
        scalable
        rotatable
        translatable
        skewable
        ref={store.setImageRef}
      ></cropper-image>
      <cropper-shade hidden></cropper-shade>

      <cropper-selection
        aspect-ratio={1}
        initial-coverage={0.75}
        keyboard
        precise
        // dynamic
        ref={store.setSelectionRef}
      >
        <cropper-handle
          action="move"
          plain
        ></cropper-handle>
      </cropper-selection>
    </cropper-canvas>
  )
}
