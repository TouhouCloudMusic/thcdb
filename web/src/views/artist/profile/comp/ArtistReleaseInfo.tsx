/* @refresh skip */
import { Trans } from "@lingui-solid/solid/macro"
import type { ComponentProps, JSX, ParentProps } from "solid-js"
import {
	createMemo,
	createSignal,
	For,
	mergeProps,
	Show,
	Suspense,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import { twJoin, twMerge } from "tailwind-merge"

import { RELEASE_TYPES, DateWithPrecision } from "~/api"
import type { ReleaseType } from "~/api"
import type { Credit, Discography } from "~/api/artist"
import { Button } from "~/components/button"
import { Tab } from "~/components/common/Tab"
import { assertContext } from "~/utils/context"

import { ArtistContext } from ".."

// TODO: Add links after other pages are completed

type ArtistReleaseType = (typeof TABS)[number]

const TABS = ["Discography", "Appearance", "Credit"] as const
export function ArtistReleaseInfo() {
	const context = assertContext(ArtistContext)

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Show
				when={
					!(
						context.discographies.isLoading ||
						context.appearances.isLoading ||
						context.credits.isLoading
					)
				}
				fallback={<div>Loading...</div>}
			>
				<Inner />
			</Show>
		</Suspense>
	)
}

function Inner() {
	const context = assertContext(ArtistContext)
	return (
		// https://github.com/kobaltedev/kobalte/issues/222
		<Tab.Root>
			<Tab.List class="grid w-fit grid-cols-3">
				<For
					each={TABS.filter((tab) => {
						switch (tab) {
							case "Appearance":
								return context.appearances.data.length
							case "Credit":
								return context.credits.data.length
							default:
								return true
						}
					})}
				>
					{(tabType) => (
						<li>
							<Tab.Trigger
								class="text-md size-full px-4 py-2.5 text-slate-800"
								value={tabType}
							>
								{tabType}
							</Tab.Trigger>
						</li>
					)}
				</For>
				<Tab.Indicator />
			</Tab.List>

			<Tab.Content<ArtistReleaseType>
				value="Discography"
				class="w-full border-t border-slate-300"
			>
				<Discography />
			</Tab.Content>
			<Tab.Content<ArtistReleaseType>
				value="Appearance"
				class="w-full border-t border-slate-300"
			>
				<ArtistReleaseList
					class="p-6"
					data={context.appearances.data}
					hasNext={context.appearances.hasNext}
					next={() => context.appearances.next()}
				>
					{(props) => <DiscographyItem {...props} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content<ArtistReleaseType>
				value="Credit"
				class="w-full border-t border-slate-300"
			>
				<ArtistReleaseList
					class="p-6"
					data={context.credits.data}
					hasNext={context.credits.hasNext}
					next={() => context.credits.next()}
				>
					{(props) => <CreditItem {...props} />}
				</ArtistReleaseList>
			</Tab.Content>
		</Tab.Root>
	)
}

function Discography() {
	const context = assertContext(ArtistContext)
	const [selectedType, setSelectedType] = createSignal<ReleaseType>("Album")

	const existingTypes = createMemo(() => {
		return RELEASE_TYPES.filter(
			(type) => context.discographies.data[type].length,
		)
	})

	return (
		<Show
			when={existingTypes().length}
			fallback={
				<div class="m-auto flex min-h-16 items-center place-self-center pl-4 whitespace-pre text-secondary">
					<Trans>
						This Artist has no releases yet, you can upload them on{" "}
						<a
							href="TODO"
							class="text-blue-600"
						>
							Upload New Release
						</a>
					</Trans>
				</div>
			}
		>
			<div class="grid grid-cols-[auto_1fr]">
				<Tab.Root
					orientation="vertical"
					onChange={setSelectedType}
				>
					<Tab.List class="space-y-2 px-2 pt-6">
						<For each={existingTypes()}>
							{(type) => (
								<Tab.Trigger
									value={type}
									class="flex h-10 items-center justify-center rounded-md px-2 text-center font-normal text-secondary outline-2 outline-offset-2 outline-transparent focus-visible:outline-slate-300 data-selected:bg-slate-100"
								>
									{type}
								</Tab.Trigger>
							)}
						</For>
					</Tab.List>
				</Tab.Root>

				<ArtistReleaseList
					class="p-6"
					data={context.discographies.data[selectedType()]}
					hasNext={context.discographies.hasNext(selectedType())}
					next={() => context.discographies.next(selectedType())}
				>
					{(props) => <DiscographyItem {...props} />}
				</ArtistReleaseList>
			</div>
		</Show>
	)
}

function ArtistReleaseList<T extends Discography | Credit>(props: {
	data?: T[] | undefined
	hasNext: boolean
	next: () => Promise<void>
	class?: string
	children: (props: { item: T }) => JSX.Element
}) {
	return (
		<ul class={twJoin("space-y-4", props.class)}>
			<For each={props.data}>
				{(release) => props.children({ item: release })}
			</For>

			<Show when={props.hasNext}>
				<div class="flex w-full justify-center">
					<Button
						variant="Tertiary"
						onClick={props.next}
						class="px-16 font-normal"
					>
						Load More
					</Button>
				</div>
			</Show>
		</ul>
	)
}

function DiscographyItem(props: { item: Discography }) {
	const context = assertContext(ArtistContext)
	const subtitle = () => {
		const displayArtistName =
			props.item.artist.some((a) => a.name === context.artist.name) ?
				undefined
			:	props.item.artist.map((a) => a.name).join(", ")

		const releaseDate =
			props.item.release_date ?
				DateWithPrecision.display(props.item.release_date)
			:	undefined
		if (displayArtistName && releaseDate) {
			return `${displayArtistName} · ${releaseDate}`
		}

		if (displayArtistName) {
			return displayArtistName
		}

		if (releaseDate) {
			return releaseDate
		}

		return "N/A"
	}
	return (
		<ItemLayout>
			<ItemTitle>{props.item.title}</ItemTitle>
			<ItemSubTitle>{subtitle()}</ItemSubTitle>
		</ItemLayout>
	)
}

function CreditItem(props: { item: Credit }) {
	return (
		<ItemLayout>
			<div class="flex whitespace-pre">
				<ItemTitle>{props.item.title}</ItemTitle>
				{" · "}
				<ul class="flex items-baseline-last whitespace-pre">
					<For each={props.item.artist}>
						{(artist, index) => (
							<li class={"text-normal leading-6 text-secondary"}>
								{artist.name}
								{index() === props.item.roles.length - 1 ?
									<></>
								:	" & "}
							</li>
						)}
					</For>
				</ul>
			</div>
			<Show when={props.item.release_date}>
				<ItemSubTitle>
					{DateWithPrecision.display(props.item.release_date)}
				</ItemSubTitle>
			</Show>
			<ItemSubTitle
				as="ul"
				class="flex whitespace-pre"
			>
				<For each={props.item.roles}>
					{(role, index) => (
						<li>
							{role.name}
							{index() === props.item.roles.length - 1 ?
								<></>
							:	", "}
						</li>
					)}
				</For>
			</ItemSubTitle>
		</ItemLayout>
	)
}

function ItemLayout(props: ParentProps) {
	return (
		<li class="flex h-16 space-x-4">
			<div class="size-16 rounded bg-secondary"></div>
			<div class="grid grid-rows-2 items-center">{props.children}</div>
		</li>
	)
}

function ItemTitle(props: ParentProps) {
	return <div class="font-semibold text-slate-1000">{props.children}</div>
}

const SUBTITLE_CLASS = "text-sm text-secondary"
function ItemSubTitle<T extends "div" | "ul" = "div">(
	props: ParentProps<
		{
			as?: T
		} & ComponentProps<T>
	>,
) {
	const finalProps = mergeProps(props, {
		get class() {
			if (props.class) {
				return twMerge(SUBTITLE_CLASS, props.class)
			}
			return SUBTITLE_CLASS
		},
		get component() {
			return props.as ?? "div"
		},
	})

	// @ts-expect-error
	return <Dynamic {...finalProps} />
}
