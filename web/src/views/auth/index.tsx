import {
  createForm,
  FormError,
  valiForm,
  type SubmitHandler,
} from "@modular-forms/solid"
import { getRouteApi, Navigate, useNavigate } from "@tanstack/solid-router"
import { createEffect, createSignal, Show, type ParentProps } from "solid-js"
import * as v from "valibot"
import { Button } from "~/components/button"
import { Divider } from "~/components/divider"
import { Input } from "~/components/input"
import { FetchClient } from "~/query"
import { useUserCtx } from "~/state/user"

const AuthCredsSchema = v.object({
  username: v.string(),
  password: v.string(),
})

type SignInForm = v.InferInput<typeof AuthCredsSchema>

export function Auth() {
  return (
    <Guard>
      <Form />
    </Guard>
  )
}

function Guard(props: ParentProps) {
  return (
    <Show
      when={!useUserCtx().is_signed_in}
      fallback={<Navigate to="/" />}
    >
      {props.children}
    </Show>
  )
}

const RouteApi = getRouteApi("/auth")

function Form() {
  let [sign_in_form, { Form, Field }] = createForm<SignInForm>({
    validate: valiForm(AuthCredsSchema),
  })

  let search_params = RouteApi.useSearch()

  let [mode, setMode] = createSignal<"sign_in" | "sign_up">(
    search_params().type,
  )

  createEffect(() => {
    setMode(search_params().type)
  })

  let user_ctx = useUserCtx()
  let nav = useNavigate()

  let handle_submit: SubmitHandler<SignInForm> = async (values, _) => {
    let { data, error } =
      mode() === "sign_in" ?
        await FetchClient.POST("/sign_in", {
          body: {
            username: values.username,
            password: values.password,
          },
        })
      : await FetchClient.POST("/sign_up", {
          body: {
            username: values.username,
            password: values.password,
          },
        })

    if (error) {
      throw new FormError<SignInForm>(error.message)
    }

    if (data) {
      user_ctx.sign_in({
        user: data.data,
      })
      return nav({ to: "/" })
    }
  }
  return (
    <Form
      datatype="application/json"
      onSubmit={handle_submit}
      class="flex flex-col gap-4 w-1/3 mx-auto p-8 rounded shadow-lg border-1 border-slate-100 mt-32"
    >
      <div class="grid grid-cols-2 gap-2 mb-2">
        <Button
          variant={mode() === "sign_in" ? "Primary" : "Tertiary"}
          onClick={() => setMode("sign_in")}
        >
          Sign In
        </Button>
        <Button
          variant={mode() === "sign_up" ? "Primary" : "Tertiary"}
          onClick={() => setMode("sign_up")}
        >
          Sign Up
        </Button>
      </div>
      <Divider
        horizonal
        class="bg-slate-300"
      />
      <Field name="username">
        {(field, props) => (
          <div class="flex flex-col gap-2">
            <label for="username">Username</label>
            <Input
              {...props}
              type="text"
              id="username"
            />
            {field.error && <div>{field.error}</div>}
          </div>
        )}
      </Field>
      <Field name="password">
        {(field, props) => (
          <div class="flex flex-col gap-2">
            <label for="password">Password</label>
            <Input
              {...props}
              type="password"
              id="password"
            />
            {field.error && <div>{field.error}</div>}
          </div>
        )}
      </Field>
      <div class="text-sm text-reimu-700">{sign_in_form.response.message}</div>
      <Divider
        horizonal
        class="bg-slate-300"
      />
      <Button
        type="submit"
        variant="Primary"
        color="Reimu"
        class="mt-4"
      >
        Sign In
      </Button>
    </Form>
  )
}
