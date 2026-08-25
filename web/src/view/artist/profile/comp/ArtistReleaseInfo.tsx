/* @refresh skip */
import { Trans, useLingui } from "@lingui/solid/macro"
import type {
	ArtistCredit,
	CreditRoleRef,
	Discography,
	ReleaseType,
} from "@thc/api"
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

import { Link } from "~/component/atomic/Link"
import { Tab } from "~/component/atomic/Tab"
import { Button } from "~/component/atomic/button"
import { RELEASE_TYPES } from "~/domain/release"
import { DateWithPrecision } from "~/domain/shared"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"

import { ArtistContext } from ".."

// TODO: Add links after other pages are completed

const TABS = [
	"Discography",
	"Appearance",
	"Credit",
	"Comments",
	"Collections",
] as const

type ArtistReleaseInfoViewProps = {
	activeTab: string
	comments: EntityCommentsModel
	onActiveTabChange: (value: string) => void
}

export function ArtistReleaseInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)

	return (
		<Suspense fallback={<div>{t`Loading...`}</div>}>
			<Show
				when={
					!(
						context.discographies.isLoading
						|| context.appearances.isLoading
						|| context.credits.isLoading
					)
				}
				fallback={<div>{t`Loading...`}</div>}
			>
				<Inner />
			</Show>
		</Suspense>
	)
}

function Inner() {
	const context = assertContext(ArtistContext)
	const [activeTab, setActiveTab] = createSignal("Discography")
	const comments = useEntityComments(() => ({
		entityType: "artist",
		entityId: context.artist.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<ArtistReleaseInfoView
			activeTab={activeTab()}
			comments={comments}
			onActiveTabChange={setActiveTab}
		/>
	)
}

export function ArtistReleaseInfoView(props: ArtistReleaseInfoViewProps) {
	const context = assertContext(ArtistContext)
	const visibleTabs = createMemo(() =>
		TABS.filter((tab) => {
			switch (tab) {
				case "Discography": {
					return true
				}
				case "Appearance": {
					return context.appearances.data.length > 0
				}
				case "Credit": {
					return context.credits.data.length > 0
				}
				case "Comments": {
					return true
				}
				case "Collections": {
					return true
				}
			}
		}),
	)

	return (
		// https://github.com/kobaltedev/kobalte/issues/222
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<Tab.List class="w-fit">
				<For each={visibleTabs()}>
					{(tabType) => (
						<li>
							<Show
								when={tabType === "Comments"}
								fallback={
									<Tab.Trigger
										class="text-md size-full px-4 py-2.5 text-slate-800"
										value={tabType}
									>
										{tabType}
									</Tab.Trigger>
								}
							>
								<EntityCommentsTabTrigger
									count={props.comments.activeCommentCount()}
									class="text-md size-full px-4 py-2.5 text-slate-800"
								/>
							</Show>
						</li>
					)}
				</For>
				<Tab.Indicator />
			</Tab.List>

			<Tab.Content
				value="Discography"
				class="w-full border-t border-slate-300"
			>
				<DiscographyTab />
			</Tab.Content>
			<Tab.Content
				value="Appearance"
				class="w-full border-t border-slate-300"
			>
				<ArtistReleaseList
					class="p-6"
					data={context.appearances.data}
					hasNext={context.appearances.hasNext}
					next={() => {
						void context.appearances.next()
					}}
				>
					{(itemProps) => <DiscographyItem {...itemProps} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content
				value="Credit"
				class="w-full border-t border-slate-300"
			>
				<ArtistReleaseList
					class="p-6"
					data={context.credits.data}
					hasNext={context.credits.hasNext}
					next={() => {
						void context.credits.next()
					}}
				>
					{(itemProps) => <CreditItem {...itemProps} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content
				value="Comments"
				class="w-full border-t border-slate-300 p-4"
			>
				<EntityComments model={props.comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				class="w-full border-t border-slate-300 p-4"
			>
				<EntityCollectionsTab
					entityType="artist"
					entityId={context.artist.id}
					enabled={props.activeTab === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}

function DiscographyTab() {
	const context = assertContext(ArtistContext)
	const [selectedTypeInput, setSelectedTypeInput] =
		createSignal<ReleaseType>("Album")

	const existingTypes = createMemo(() => {
		return RELEASE_TYPES.filter(
			(type) => context.discographies.data[type].length,
		)
	})

	const selectedType = createMemo<ReleaseType | undefined>(() => {
		const current = selectedTypeInput()
		if (existingTypes().includes(current)) {
			return current
		}

		return existingTypes()[0]
	})

	return (
		<Show
			when={selectedType()}
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
			{(type) => (
				<div class="grid grid-cols-[auto_1fr]">
					<Tab.Root
						orientation="vertical"
						value={type()}
						onChange={setSelectedTypeInput}
					>
						<Tab.List class="space-y-2 px-2 pt-6">
							<For each={existingTypes()}>
								{(releaseType) => (
									<Tab.Trigger
										value={releaseType}
										class="flex h-10 items-center justify-center rounded-md px-2 text-center font-normal text-secondary outline-2 outline-offset-2 outline-transparent focus-visible:outline-slate-300 data-selected:bg-slate-100"
									>
										{releaseType}
									</Tab.Trigger>
								)}
							</For>
						</Tab.List>
					</Tab.Root>

					<ArtistReleaseList
						class="p-6"
						data={context.discographies.data[type()]}
						hasNext={context.discographies.hasNext(type())}
						next={() => {
							void context.discographies.next(type())
						}}
					>
						{(props) => <DiscographyItem {...props} />}
					</ArtistReleaseList>
				</div>
			)}
		</Show>
	)
}

function ArtistReleaseList<T extends Discography | CreditRoleRef>(props: {
	data?: T[] | undefined
	hasNext: boolean
	next: () => void
	class?: string
	children: (props: { item: T }) => JSX.Element
}) {
	const { t } = useLingui()

	return (
		<ul class={twJoin("space-y-4", props.class)}>
			<For each={props.data}>
				{(release) => props.children({ item: release })}
			</For>

			<Show when={props.hasNext}>
				<div class="flex w-full justify-center">
					<Button
						variant="Tertiary"
						onClick={() => props.next()}
						class="px-16 font-normal"
					>
						{t`Load More`}
					</Button>
				</div>
			</Show>
		</ul>
	)
}

function DiscographyItem(props: { item: Discography }) {
	const context = assertContext(ArtistContext)
	const subtitle = () => {
		const displayArtistName = props.item.artist.some(
			(a) => a.name === context.artist.name,
		)
			? undefined
			: props.item.artist.map((a) => a.name).join(", ")

		const releaseDate = props.item.release_date
			? DateWithPrecision.display(props.item.release_date)
			: undefined
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
		<ItemLayout releaseId={props.item.release_id}>
			<ItemTitle>{props.item.title}</ItemTitle>
			<ItemSubTitle>{subtitle()}</ItemSubTitle>
		</ItemLayout>
	)
}

function CreditItem(props: { item: ArtistCredit }) {
	return (
		<ItemLayout releaseId={props.item.release_id}>
			<div class="flex whitespace-pre">
				<ItemTitle>{props.item.title}</ItemTitle>
				{" · "}
				<ul class="flex items-baseline-last whitespace-pre">
					<For each={props.item.artist}>
						{(artist, index) => (
							<li class={"text-normal leading-6 text-secondary"}>
								{artist.name}
								{index() === props.item.roles.length - 1 ? <></> : " & "}
							</li>
						)}
					</For>
				</ul>
			</div>
			<Show when={props.item.release_date}>
				<ItemSubTitle>
					{DateWithPrecision.display(props.item.release_date!)}
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
							{index() === props.item.roles.length - 1 ? <></> : ", "}
						</li>
					)}
				</For>
			</ItemSubTitle>
		</ItemLayout>
	)
}

function ItemLayout(props: ParentProps<{ releaseId: number }>) {
	const content = () => (
		<>
			<div class="size-16 rounded bg-secondary"></div>
			<div class="grid grid-rows-2 items-center">{props.children}</div>
		</>
	)

	return (
		<li>
			<Link
				to="/release/$id"
				params={{ id: props.releaseId.toString() }}
				underline={false}
				class="flex h-16 w-full space-x-4 rounded-md -mx-2 px-2 text-inherit hover:bg-slate-50"
			>
				{content()}
			</Link>
		</li>
	)
}

function ItemTitle(props: ParentProps) {
	return <div class="font-semibold text-slate-900">{props.children}</div>
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
