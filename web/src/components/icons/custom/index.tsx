import type { IconProps } from "solid-radix-icons"

// Custom MusicNoteIcon since solid-radix-icons doesn't have one
export const MusicNoteIcon = (props: { class?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="15"
		height="15"
		viewBox="0 0 15 15"
		fill="none"
		stroke="currentColor"
		stroke-width="1"
		stroke-linecap="round"
		stroke-linejoin="round"
		{...props}
	>
		<path d="M5.5 10.5V4L10.5 3V9M5.5 6L10.5 5M8 10.5C8 11.3284 7.32843 12 6.5 12C5.67157 12 5 11.3284 5 10.5C5 9.67157 5.67157 9 6.5 9C7.32843 9 8 9.67157 8 10.5ZM13 9.5C13 10.3284 12.3284 11 11.5 11C10.6716 11 10 10.3284 10 9.5C10 8.67157 10.6716 8 11.5 8C12.3284 8 13 8.67157 13 9.5Z"></path>
	</svg>
)

// Custom RankingIcon
export const RankingIcon = (props: IconProps) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="15"
		height="15"
		viewBox="0 0 15 15"
		fill="none"
		stroke="currentColor"
		stroke-width="1"
		stroke-linecap="round"
		stroke-linejoin="round"
		{...props}
	>
		<path d="M3.5 2v11M7.5 5.5v7.5M11.5 2v11M3.5 11.5h8M3.5 7.5h4M3.5 3.5h8"></path>
	</svg>
)
