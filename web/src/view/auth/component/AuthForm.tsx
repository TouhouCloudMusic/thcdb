import { Field, Form } from "@formisch/solid"
import { Tabs } from "@kobalte/core/tabs"
import { For, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"

import type { AuthFormMode } from "../store"
import { useAuthForm } from "../store"
import { UserNameField, PasswordField } from "./Field"

const isAuthFormMode = (value: string): value is AuthFormMode =>
	value === "sign_in" || value === "sign_up"

export function AuthForm() {
	const {
		mode,
		setMode,
		signInForm,
		signUpForm,
		submitError,
		handleSignIn,
		handleSignUp,
	} = useAuthForm()

	return (
		<div class="relative min-h-full overflow-hidden bg-linear-to-br from-reimu-100 via-primary to-marisa-100">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px] opacity-55"></div>
			<section class="relative min-h-full">
				<div class="grid min-h-full w-full items-stretch lg:grid-cols-[1.05fr_0.95fr]">
					<div class="hidden flex-col justify-center gap-6 px-8 py-12 lg:flex xl:px-14">
						<div class="flex items-center gap-3">
							<img
								src="/logo.svg"
								alt=""
								class="h-10 w-10"
							/>
							<div class="flex flex-col leading-none">
								<div class="text-xs font-medium tracking-[0.22em] text-secondary">
									TOUHOU CLOUD DB
								</div>
								<div class="text-xs text-tertiary">
									Lorem ipsum dolor sit amet consectetur
								</div>
							</div>
						</div>

						<div class="flex flex-col gap-3">
							<h1 class="text-5xl font-light tracking-tighter text-primary">
								Lorem ipsum dolor sit amet consectetur
							</h1>
							<h2 class="text-xl text-tertiary">
								Lorem ipsum dolor sit, amet consectetur adipisicing elit.
								Exercitationem earum ipsam tempora, aut fugiat
							</h2>
						</div>

						<div class="grid gap-3 pt-2 text-sm text-secondary">
							<div class="flex items-center gap-2">
								<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
								<span>
									Add missing entries (artists, releases, songs, events)
								</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
								<span>Submit corrections and keep metadata clean</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
								<span>Sync your contributions across devices</span>
							</div>
						</div>
					</div>

					<div class="min-h-full border-t border-slate-300 bg-primary/70 px-4 py-12 backdrop-blur-sm sm:px-8 lg:border-l lg:border-t-0 xl:px-14">
						<div class="mx-auto w-full max-w-[420px]">
							<div class="mb-6 flex items-center gap-3 lg:hidden">
								<img
									src="/logo.svg"
									alt=""
									class="h-9 w-9"
								/>
								<div class="flex flex-col leading-none">
									<div class="text-xs font-medium tracking-[0.22em] text-secondary">
										TOUHOU CLOUD DB
									</div>
									<div class="text-xs text-tertiary">
										Lorem ipsum dolor sit amet consectetur
									</div>
								</div>
							</div>

							<div class="mb-6 space-y-1">
								<div class="text-primary text-3xl font-light tracking-tight">
									{mode() === "sign_in"
										? "Welcome back"
										: "Create your account"}
								</div>
								<div class="text-sm text-tertiary">
									{mode() === "sign_in"
										? "Sign in to continue."
										: "Create an account to join the community."}
								</div>
							</div>

							<Tabs
								value={mode()}
								onChange={(value) => {
									if (!isAuthFormMode(value)) return
									setMode(value)
								}}
								class="mb-6"
							>
								<Tabs.List class="relative grid grid-cols-2 rounded-lg bg-secondary p-1.5 ring-1 ring-slate-200">
									<For each={["Sign In", "Sign Up"]}>
										{(value) => (
											<Tabs.Trigger
												value={value == "Sign In" ? "sign_in" : "sign_up"}
												class="relative z-10 rounded-md px-4 py-2.5 text-sm  text-tertiary outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-reimu-600 data-selected:text-primary"
											>
												{value}
											</Tabs.Trigger>
										)}
									</For>
									<Tabs.Indicator class="absolute inset-y-1.5 rounded-md bg-primary shadow-xs ring-1 ring-slate-200 transition-all duration-200" />
								</Tabs.List>
							</Tabs>

							<Show
								when={mode() === "sign_in"}
								fallback={
									<Form
										of={signUpForm}
										onSubmit={handleSignUp}
										class="w-full space-y-6"
									>
										<Field
											of={signUpForm}
											path={["username"]}
										>
											{(field) => <UserNameField field={field} />}
										</Field>
										<Field
											of={signUpForm}
											path={["password"]}
										>
											{(field) => (
												<PasswordField
													label="Password"
													field={field}
													showRequirementHint
												/>
											)}
										</Field>
										<Field
											of={signUpForm}
											path={["repeated_password"]}
										>
											{(field) => (
												<PasswordField
													label="Repeat password"
													field={field}
												/>
											)}
										</Field>

										{/* TODO: Rememeber me */}

										<FormComp.ErrorMessage>
											{submitError()}
										</FormComp.ErrorMessage>

										<Button
											type="submit"
											variant="Primary"
											color="Reimu"
											size="Sm"
											class="mt-1 h-9 w-full"
											disabled={signUpForm.isSubmitting}
										>
											Sign Up
										</Button>
									</Form>
								}
							>
								<Form
									of={signInForm}
									onSubmit={handleSignIn}
									class="w-full space-y-6"
								>
									<Field
										of={signInForm}
										path={["username"]}
									>
										{(field) => <UserNameField field={field} />}
									</Field>
									<Field
										of={signInForm}
										path={["password"]}
									>
										{(field) => (
											<PasswordField
												label="Password"
												field={field}
											/>
										)}
									</Field>

									{/* TODO: Rememeber me */}

									<FormComp.ErrorMessage>{submitError()}</FormComp.ErrorMessage>

									<Button
										type="submit"
										variant="Primary"
										color="Reimu"
										size="Sm"
										class="mt-1 h-9 w-full"
										disabled={signInForm.isSubmitting}
									>
										Sign In
									</Button>
								</Form>
							</Show>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
