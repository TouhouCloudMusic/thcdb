import { useLingui } from "@lingui/solid/macro"
import { ArrowDownIcon, ArrowUpIcon } from "@thc/icons/radix"
import { Match, Show, Switch } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import { Image } from "~/component/image"
import { DateWithPrecision } from "~/domain/shared"
import type {
	ArtistSummary,
	EntitySummary,
	EventSummary,
	LabelSummary,
	PageResponseUserCollectionItemDetail,
	ReleaseSummary,
	SimpleArtist,
	SongSummary,
	TagSummary,
} from "~/hey-api"
import { imgUrl } from "~/utils/adapter/static_file"

export type UserCollectionItemDetail =
	PageResponseUserCollectionItemDetail["items"][number]

type Props = {
	item: UserCollectionItemDetail
	number: number
	isEditing: boolean
	isDeleting: boolean
	isReordering: boolean
	canMoveUp: boolean
	canMoveDown: boolean
	onDelete: () => void
	onMoveUp: () => void
	onMoveDown: () => void
}

const MOVE_BUTTON_CLASS =
	"grid size-7 place-items-center rounded-sm border border-slate-200 bg-white text-tertiary hover:bg-slate-100 hover:text-primary disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:outline-1 focus-visible:outline-slate-500"

function ArtistCard(props: { id: number; summary: ArtistSummary }) {
	return (
		<Link
			to="/artist/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
				<Image.Root>
					<Show when={props.summary.profile_image_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								class="h-full w-full object-cover"
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div class="flex flex-col">
				<span class="font-medium text-slate-900 group-hover:text-blue-600">
					{props.summary.name}
				</span>
				<span class="text-xs text-slate-500">{props.summary.artist_type}</span>
			</div>
		</Link>
	)
}

function ReleaseCard(props: { id: number; summary: ReleaseSummary }) {
	const artistNames = () =>
		props.summary.artists?.map((a: SimpleArtist) => a.name).join(", ")

	return (
		<Link
			to="/release/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<div class="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-slate-100 border border-slate-200">
				<Image.Root>
					<Show when={props.summary.cover_art_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								class="h-full w-full object-cover"
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div class="flex flex-col">
				<span class="font-medium text-slate-900 group-hover:text-blue-600">
					{props.summary.title}
				</span>
				<Show when={artistNames()}>
					{(names) => (
						<span class="text-xs text-slate-500 line-clamp-1">{names()}</span>
					)}
				</Show>
				<Show when={props.summary.release_date}>
					{(date) => (
						<span class="text-xs text-slate-500">
							{DateWithPrecision.display(date())}
						</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function SongCard(props: { id: number; summary: SongSummary }) {
	const artistNames = () =>
		props.summary.artists?.map((a: SimpleArtist) => a.name).join(", ")

	return (
		<Link
			to="/song/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<div class="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-slate-100 border border-slate-200">
				<Image.Root>
					<Show when={props.summary.cover_art_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								class="h-full w-full object-cover"
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div class="flex flex-col">
				<span class="font-medium text-slate-900 group-hover:text-blue-600">
					{props.summary.title}
				</span>
				<Show when={artistNames()}>
					{(names) => (
						<span class="text-xs text-slate-500 line-clamp-1">{names()}</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function TagCard(props: { id: number; summary: TagSummary }) {
	return (
		<Link
			to="/tag/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<div class="flex flex-col">
				<span class="font-medium text-slate-900 group-hover:text-blue-600">
					{props.summary.name}
				</span>
				<span class="text-xs text-slate-500">{props.summary.tag_type}</span>
			</div>
		</Link>
	)
}

function EventCard(props: { id: number; summary: EventSummary }) {
	return (
		<Link
			to="/event/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<div class="flex flex-col">
				<span class="font-medium text-slate-900 group-hover:text-blue-600">
					{props.summary.name}
				</span>
				<Show when={props.summary.start_date}>
					{(date) => (
						<span class="text-xs text-slate-500">
							{DateWithPrecision.display(date())}
						</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function LabelCard(props: { id: number; summary: LabelSummary }) {
	return (
		<Link
			to="/label/$id"
			params={{ id: props.id.toString() }}
			class="flex items-center gap-4 no-underline hover:underline group"
		>
			<span class="font-medium text-slate-900 group-hover:text-blue-600">
				{props.summary.name}
			</span>
		</Link>
	)
}

function EntityContent(props: { summary: EntitySummary }) {
	return (
		<Switch
			fallback={<span class="text-sm text-tertiary">#{props.summary.id}</span>}
		>
			<Match
				keyed
				when={props.summary.entity_type === "Artist" && props.summary}
			>
				{(summary) => (
					<ArtistCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Release" && props.summary}
			>
				{(summary) => (
					<ReleaseCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Song" && props.summary}
			>
				{(summary) => (
					<SongCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Tag" && props.summary}
			>
				{(summary) => (
					<TagCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Event" && props.summary}
			>
				{(summary) => (
					<EventCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Label" && props.summary}
			>
				{(summary) => (
					<LabelCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
		</Switch>
	)
}

export function CollectionItemCard(props: Props) {
	const { t } = useLingui()
	const entityTypeLabel = () => {
		switch (props.item.entity_type) {
			case "Artist": {
				return t`Artist`
			}
			case "Label": {
				return t`Label`
			}
			case "Release": {
				return t`Release`
			}
			case "Song": {
				return t`Song`
			}
			case "Tag": {
				return t`Tag`
			}
			case "Event": {
				return t`Event`
			}
			case "CreditRole": {
				return t`Credit role`
			}
			case "SongLyrics": {
				return t`Song lyrics`
			}
		}
	}
	return (
		<li class="flex flex-col gap-3 rounded-sm border border-slate-300 bg-primary p-4 shadow-xs transition-shadow hover:shadow-md">
			<div class="flex flex-col gap-3 w-full">
				<div class="flex items-center gap-3">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-tertiary">
						{props.number}
					</span>
					{/* Entity type label */}
					<span class="text-xs text-tertiary">{entityTypeLabel()}</span>
					<Show when={props.isEditing}>
						<div class="ml-auto flex shrink-0 items-center gap-1">
							<button
								type="button"
								class={MOVE_BUTTON_CLASS}
								aria-label={t`Move item up`}
								title={t`Move item up`}
								disabled={props.isReordering || !props.canMoveUp}
								onClick={() => props.onMoveUp()}
							>
								<ArrowUpIcon class="size-3.5" />
							</button>
							<button
								type="button"
								class={MOVE_BUTTON_CLASS}
								aria-label={t`Move item down`}
								title={t`Move item down`}
								disabled={props.isReordering || !props.canMoveDown}
								onClick={() => props.onMoveDown()}
							>
								<ArrowDownIcon class="size-3.5" />
							</button>
						</div>
					</Show>
				</div>

				<div class="ml-9">
					<Show
						when={props.item.entity}
						fallback={
							<span class="text-sm text-tertiary">#{props.item.entity_id}</span>
						}
					>
						{(summary) => <EntityContent summary={summary()} />}
					</Show>

					{/* Description + Remove row */}
					<Show when={props.item.description || props.isEditing}>
						<div class="mt-3 flex items-start gap-4 border-t border-slate-100 pt-3">
							<Show when={props.item.description}>
								<p class="text-sm text-secondary">{props.item.description}</p>
							</Show>

							<Show when={props.isEditing}>
								<AlertDialog
									title={t`Remove from collection`}
									description={t`Are you sure you want to remove this item from the collection?`}
									confirmText={t`Remove`}
									onCancel={() => undefined}
									onConfirm={props.onDelete}
									triggerAs={(triggerProps) => (
										<button
											{...triggerProps}
											class="ml-auto self-end shrink-0 text-xs text-tertiary hover:text-red-600 hover:underline disabled:opacity-50 focus:outline-none"
											disabled={props.isDeleting}
										>
											{t`Remove`}
										</button>
									)}
								/>
							</Show>
						</div>
					</Show>
				</div>
			</div>
		</li>
	)
}
