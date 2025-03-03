import { getErrors, getValues, type SubmitHandler } from "@modular-forms/solid"
import { useAction, useNavigate } from "@solidjs/router"
import { useQueryClient, type CreateQueryResult } from "@tanstack/solid-query"
import { Show } from "solid-js"
import { ArrowLeftIcon } from "solid-radix-icons"

import { PrimaryButton, TertiaryButton } from "~/components/button/index.tsx"
import { useI18N } from "~/state/i18n"

import { type ArtistFormSchema } from "../data/form/index.ts"
import {
  createController,
  Query,
  SubmitAction,
  type ArtistByID,
} from "../data/index.ts"
import { ControllerContext, useController } from "./context.tsx"

import { FieldSet } from "~/components/form/index.tsx"
import { Aliases } from "./sections/alias.tsx"
import { ArtistType } from "./sections/artist_type.tsx"
import { DateField } from "./sections/date.tsx"
import { ID } from "./sections/id.tsx"
import { LocalizedName } from "./sections/localized_name.tsx"
import { MemberList } from "./sections/member.tsx"
import { Name } from "./sections/name.tsx"

export function ArtistFormLayout(props: {
  dataQuery?: CreateQueryResult<ArtistByID | null>
}) {
  const dictQuery = Query.fetchDict(useI18N().locale)

  return (
    <Show when={dictQuery.data}>
      {(dict) => (
        <ControllerContext.Provider
          value={createController(props.dataQuery, dict)}
        >
          <Main />
        </ControllerContext.Provider>
      )}
    </Show>
  )
}

function Main() {
  const { dataQuery, formStore, form, t, Form } = useController()
  const action = useAction(SubmitAction)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const handleSubmit: SubmitHandler<ArtistFormSchema> = async (formData) => {
    if (!form.changed) return form.setErrMsg("No changes")

    const res = await action(formData, dataQuery?.data)
    void queryClient.invalidateQueries({
      queryKey: Query.dataQueryKey.concat(res.toString()),
    })
    return navigate(`/artist/${res}`)
  }

  return (
    <main class="flex bg-slate-100 dark:bg-slate-900">
      <div class="bg-primary mx-auto min-w-full max-w-7xl md:min-w-[60%] md:border-x">
        <div class="flex h-16 w-56 items-center justify-evenly">
          <a
            href={dataQuery ? `/artist/${dataQuery.data?.id}` : "/artists"}
            class="text-slate-600"
          >
            <ArrowLeftIcon
              width={24}
              height={24}
            />
          </a>
          <h1 class="font-['Inter'] text-2xl font-light">
            <Show
              when={dataQuery}
              fallback={"New Artist"}
            >
              {"Editing: "}
              <a href={["/artist", dataQuery?.data?.id].join("/")}>
                {dataQuery?.data?.name}
              </a>
            </Show>
          </h1>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-[auto_1fr]">
          {/* Side Bar */}
          <aside class="dark:bg-slate-1100 col-start-1 hidden w-56 bg-slate-200 pb-16 md:block"></aside>
          <Form
            aria-label="Artist form"
            onSubmit={handleSubmit}
            method="post"
            class="flex w-full flex-col gap-8 border-t-2 border-slate-200 px-6 pb-16 pt-4"
          >
            <ID />

            <div class={FieldSet.className}>
              <div class="grid grid-cols-1 gap-4 gap-y-8 md:grid-cols-6">
                <div class="md:col-span-4">
                  <Name />
                </div>
                <div class="col-span-full">
                  <ArtistType />
                </div>
                <div class="col-span-full">
                  <LocalizedName />
                </div>
                <div class="col-span-full">
                  <Aliases />
                </div>
              </div>
            </div>
            <div class={FieldSet.className}>
              <div class="grid grid-cols-1 gap-4 gap-y-8 md:grid-cols-6">
                <div class="col-span-full">
                  <DateField />
                </div>
              </div>
            </div>

            <MemberList />

            <div class="flex w-full flex-row place-content-around">
              <PrimaryButton
                type="submit"
                color="reimu"
                class="w-1/4 self-start py-1"
              >
                {t.submit()}
              </PrimaryButton>
              <Show when={import.meta.env.DEV}>
                <LogBtn />
              </Show>
            </div>
            {/* <FormUI.ErrorText text={form.errMsg} /> */}
            <FormUI.ErrorText text={formStore.response.message} />
          </Form>
        </div>
      </div>
    </main>
  )
}

function LogBtn() {
  const { form, formStore } = useController()
  return (
    <TertiaryButton
      type="button"
      class="w-1/4 self-start py-1"
      onClick={() => {
        console.info("form changed: ", form.changed)

        console.info("form error: ", getErrors(formStore))
        console.info(
          "form value: ",
          getValues(formStore, {
            shouldActive: false,
          }),
        )
      }}
    >
      Log
    </TertiaryButton>
  )
}
