export type ArtistLite = { id: number; name: string }
export type SongLite = { id: number; title: string }
export type EventLite = { id: number; name: string }
export type CreditRoleLite = { id: number; name: string }
export type LabelLite = { id: number; name: string }

export function ArtistInfo(props: { value: ArtistLite }) {
	return (
		<span class="inline-flex items-baseline gap-2">
			<span class="text-primary">{props.value.name}</span>
		</span>
	)
}

export function SongInfo(props: { value: SongLite }) {
	return (
		<span class="inline-flex items-baseline gap-2">
			<span class="text-primary">{props.value.title}</span>
		</span>
	)
}

export function EventInfo(props: { value: EventLite }) {
	return (
		<span class="inline-flex items-baseline gap-2">
			<span class="text-primary">{props.value.name}</span>
		</span>
	)
}

export function CreditRoleInfo(props: { value: CreditRoleLite }) {
	return (
		<span class="inline-flex items-baseline gap-2">
			<span class="text-primary">{props.value.name}</span>
		</span>
	)
}

export function LabelInfo(props: { value: LabelLite }) {
	return (
		<span class="inline-flex items-baseline gap-2">
			<span class="text-primary">{props.value.name}</span>
		</span>
	)
}
