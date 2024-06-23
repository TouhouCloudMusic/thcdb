/* eslint-disable @typescript-eslint/unbound-method */
import { test, expect, describe } from "vitest"
import { render } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { ThemeButton } from "~/component/themeButton"
import { AppStateProvider, AppTheme } from "~/state/app.state"
import { ParentComponent } from "solid-js"
import { MoonIcon, SunIcon } from "solid-radix-icons"

const themeButtonTestWrapper: ParentComponent = (props) => (
	<div id="app">
		<AppStateProvider
			defaultState={{
				theme: AppTheme.light,
				user: {
					id: 1,
					username: "admin",
				},
			}}>
			{props.children}
		</AppStateProvider>
	</div>
)

describe("Theme button", async () => {
	const user = userEvent.setup()
	const { findByRole } = render(() => <ThemeButton />, {
		wrapper: themeButtonTestWrapper,
	})
	let button = await findByRole("button")
	test("Render theme", () => {
		expect(button.querySelector("svg")).toEqual(<SunIcon />)
	})

	test("Change theme", async () => {
		await user.click(button)
		button = await findByRole("button")
		expect(button.querySelector("svg")).toEqual(<MoonIcon />)
	})
})
