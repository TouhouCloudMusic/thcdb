import { createForm, valiForm, type SubmitHandler } from "@modular-forms/solid"
import { useNavigate } from "@tanstack/solid-router"
import { error } from "openapi-typescript"
import * as v from "valibot"
import { Button } from "~/components/button"
import { Input } from "~/components/input"
import { FetchClient } from "~/query"
import { use_user_ctx } from "~/state/user"

export function Auth() {
  return <SignIn />
}

const AuthCredsSchema = v.object({
  username: v.string(),
  password: v.string(),
})

type SignInForm = v.InferInput<typeof AuthCredsSchema>

function SignIn() {
  let [_, { Form, Field }] = createForm<SignInForm>({
    validate: valiForm(AuthCredsSchema),
  })

  let user_ctx = use_user_ctx()

  let nav = useNavigate()

  let handle_submit: SubmitHandler<SignInForm> = async (values, _) => {
    let res = await FetchClient.POST("/sign_in", {
      body: {
        username: values.username,
        password: values.password,
      },
      credentials: "include",
    })

    if (res.error) {
      throw error
    }

    user_ctx.sign_in({
      user: res.data!.data,
    })

    return nav({ to: "/" })
  }

  return (
    <Form
      datatype="application/json"
      onSubmit={handle_submit}
      class="flex flex-col gap-4 w-1/3 mx-auto"
    >
      <Field name="username">
        {(field, props) => (
          <>
            <label for="username">Username</label>
            <Input
              {...props}
              type="text"
              id="username"
            />
            {field.error && <div>{field.error}</div>}
          </>
        )}
      </Field>
      <Field name="password">
        {(field, props) => (
          <>
            <label for="password">Password</label>
            <Input
              {...props}
              type="password"
              id="password"
            />
            {field.error && <div>{field.error}</div>}
          </>
        )}
      </Field>

      <Button
        type="submit"
        variant="Primary"
      >
        Submit
      </Button>
    </Form>
  )
}
