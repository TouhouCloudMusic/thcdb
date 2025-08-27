/* @refresh skip */
import { useLingui } from "@lingui-solid/solid/macro"
import { useNavigate } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import type { ParentProps } from "solid-js"
import { createMemo, Show, For } from "solid-js"
import { ArrowLeftIcon } from "solid-radix-icons"

import { Button } from "~/components/atomic/button"
import { DateWithPrecision } from "~/domain/shared"
import { assertContext } from "~/utils/solid/assertContext"

import { ArtistContext } from ".."

export function ArtistInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const navigator = useNavigate()

	return (
		<div class="flex flex-col">
			<h1 class="text-xl font-semibold">{context.artist.name}</h1>
			<div class="mt-4 space-y-2">
				<Show when={context.artist.artist_type !== "Unknown"}>
					<DateInfo
						value={context.artist.start_date}
						label={context.artist.artist_type == "Solo" ? t`Born` : t`Formed`}
					/>
					<DateInfo
						value={context.artist.end_date}
						label={
							context.artist.artist_type == "Solo" ? t`Died` : t`Disbanded`
						}
					/>
				</Show>
				<Location location={context.artist.start_location} />
				<Location location={context.artist.current_location} />
				<Aliases />
				<Membership />
				<Links />
			</div>
			{/* Test */}
			<Button
				class="mt-4 w-fit"
				variant="Tertiary"
				size="Sm"
				onClick={() => {
					void navigator({
						to: "/artist/" + context.artist.id + "/edit",
					})
				}}
			>
				Edit
			</Button>
		</div>
	)
}

function Aliases() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const aliases = createMemo(() => getInfoAliases(context.artist))
	return (
		<div>
			<InfoLabel>{t`Aliases`}</InfoLabel>
			<ul class="flex flex-row gap-1">
				<For each={aliases()}>
					{(alias, index) => (
						<>
							<li>
								<Show
									when={alias.id}
									fallback={alias.name}
								>
									{alias.id}
								</Show>
								<Show when={aliases().length - 1 > index()}>{", "}</Show>
							</li>
						</>
					)}
				</For>
			</ul>
		</div>
	)
}

function DateInfo(props: { value?: Artist["start_date"]; label: string }) {
	const parsedDate = createMemo(() => {
		if (!props.value) {
			return
		}

		return DateWithPrecision.display(props.value)
	})
	return (
		<Show when={props.value}>
			<div class="flex flex-col">
				<InfoLabel>{props.label}</InfoLabel>
				<span class="text-slate-1000">{parsedDate()}</span>
			</div>
		</Show>
	)
}

function Membership() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)
	const label = createMemo(() => {
		if (context.artist.artist_type === "Solo") {
			return t`Member Of`
		} else if (context.artist.artist_type === "Multiple") {
			return t`Members`
		}
	})
	return (
		<Show
			when={
				context.artist.artist_type !== "Unknown"
				&& context.artist.memberships?.length
			}
		>
			<div>
				<span class="text-sm text-secondary">{label()}</span>
				<ul>
					<For each={context.artist.memberships}>
						{(membership) => <li>{membership.artist_id}</li>}
					</For>
				</ul>
			</div>
		</Show>
	)
}

function Links() {
	const context = assertContext(ArtistContext)
	return (
		<Show when={context.artist.links?.length}>
			<div>
				<InfoLabel>Links</InfoLabel>
				<ul>
					<For each={context.artist.links}>
						{(link) => (
							<li>
								<a
									class="text-blue-600"
									href={link}
								>
									{link}
								</a>
							</li>
						)}
					</For>
				</ul>
			</div>
		</Show>
	)
}

function Location(props: { location?: Artist["start_location"] }) {
	return (
		<Show when={props.location?.country}>
			<div>
				{props.location!.country}
				{props.location!.province && <>, {props.location!.province}</>}
				{props.location!.city && <>, {props.location!.city}</>}
			</div>
		</Show>
	)
}

function InfoLabel(props: ParentProps) {
	return <span class="text-sm text-tertiary">{props.children}</span>
}

// Data utils

type InfoAlias = {
	id?: number
	name?: string
}

function getInfoAliases(artist: Artist): InfoAlias[] {
	let arr: InfoAlias[] = []

	if (artist.aliases) {
		for (const aliasId of artist.aliases) {
			arr.push({
				id: aliasId,
			})
		}
	}

	if (artist.text_aliases) {
		for (const alias of artist.text_aliases) {
			arr.push({
				name: alias,
			})
		}
	}

	return arr
}
