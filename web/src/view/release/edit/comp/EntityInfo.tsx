import * as stylex from "@stylexjs/stylex"

import { colors, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	entity: { display: "inline-flex", alignItems: "baseline", gap: px[8] },
	name: { color: colors.textPrimary },
})

export type ArtistLite = { id: number; name: string }
export type SongLite = { id: number; title: string }
export type EventLite = { id: number; name: string }
export type CreditRoleLite = { id: number; name: string }
export type LabelLite = { id: number; name: string }

export function ArtistInfo(props: { value: ArtistLite }) {
	return (
		<span {...stylex.attrs(styles.entity)}>
			<span {...stylex.attrs(styles.name)}>{props.value.name}</span>
		</span>
	)
}

export function SongInfo(props: { value: SongLite }) {
	return (
		<span {...stylex.attrs(styles.entity)}>
			<span {...stylex.attrs(styles.name)}>{props.value.title}</span>
		</span>
	)
}

export function EventInfo(props: { value: EventLite }) {
	return (
		<span {...stylex.attrs(styles.entity)}>
			<span {...stylex.attrs(styles.name)}>{props.value.name}</span>
		</span>
	)
}

export function CreditRoleInfo(props: { value: CreditRoleLite }) {
	return (
		<span {...stylex.attrs(styles.entity)}>
			<span {...stylex.attrs(styles.name)}>{props.value.name}</span>
		</span>
	)
}

export function LabelInfo(props: { value: LabelLite }) {
	return (
		<span {...stylex.attrs(styles.entity)}>
			<span {...stylex.attrs(styles.name)}>{props.value.name}</span>
		</span>
	)
}
