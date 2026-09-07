import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { createSignal, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, size, radius } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		position: "fixed",
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 50,
		height: size[80],
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: palette.slate[200],
		backgroundColor: palette.white,
		boxShadow:
			"0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)",
	},
	container: {
		width: "100%",
		maxWidth: {
			default: null,
			"@media (min-width: 40rem)": size[640],
			"@media (min-width: 48rem)": size[768],
			"@media (min-width: 64rem)": size[1024],
			"@media (min-width: 80rem)": size[1280],
			"@media (min-width: 96rem)": size[1536],
		},
		marginInline: "auto",
		display: "flex",
		height: "100%",
		alignItems: "center",
		paddingInline: size[16],
	},
	details: { display: "flex", width: "25%", alignItems: "center" },
	cover: {
		marginRight: size[12],
		height: size[48],
		width: size[48],
		overflow: "hidden",
		borderRadius: radius.sm,
	},
	image: { height: "100%", width: "100%", objectFit: "cover" },
	text: { overflow: "hidden" },
	title: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: palette.slate[800],
	},
	artist: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	favorite: { marginLeft: size[16], color: palette.slate[400] },
	icon: { height: size[20], width: size[20] },
	controls: {
		display: "flex",
		width: "50%",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},
	buttons: { display: "flex", alignItems: "center" },
	skip: {
		color: {
			default: palette.slate[500],
			":hover": {
				"@media (hover: hover)": palette.slate[700],
			},
		},
		marginInlineEnd: { default: size[16], ":last-child": 0 },
	},
	play: {
		borderRadius: radius.full,
		padding: size[8],
		color: palette.white,
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter, display, visibility, content-visibility, overlay, pointer-events",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
		marginInlineEnd: size[16],
	},
	playIcon: { height: size[24], width: size[24] },
	progress: {
		marginTop: size[8],
		display: "flex",
		width: "100%",
		alignItems: "center",
	},
	elapsed: {
		marginRight: size[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	track: {
		height: size[4],
		flex: "1",
		overflow: "hidden",
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
	},
	fill: { height: "100%" },
	duration: {
		marginLeft: size[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	volume: {
		display: "flex",
		width: "25%",
		alignItems: "center",
		justifyContent: "flex-end",
	},
	volumeButton: {
		marginRight: size[8],
		color: {
			default: palette.slate[500],
			":hover": {
				"@media (hover: hover)": palette.slate[700],
			},
		},
	},
	volumeTrack: {
		height: size[4],
		width: size[96],
		overflow: "hidden",
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
	},
	queue: {
		marginLeft: size[16],
		color: {
			default: palette.slate[500],
			":hover": {
				"@media (hover: hover)": palette.slate[700],
			},
		},
	},
})

type Song = {
	id: number
	title: string
	artist: string
	coverUrl: string
	duration: number
}

const formatTime = (seconds: number) => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function Player() {
	const { t } = useLingui()
	const [currentSong] = createSignal<Song | null>({
		id: 1,
		title: t`幻想乡之歌`,
		artist: "ZUN",
		coverUrl: "https://placehold.co/60x60/red/white?text=ZUN",
		duration: 180,
	})

	const [isPlaying, setIsPlaying] = createSignal(false)
	const [currentTime] = createSignal(0)
	const [volume] = createSignal(80)

	const togglePlay = () => {
		setIsPlaying(!isPlaying())
	}

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.container)}>
				{/* 歌曲信息 */}
				<div {...stylex.attrs(styles.details)}>
					<Show when={currentSong()}>
						{(song) => (
							<>
								<div {...stylex.attrs(styles.cover)}>
									<img
										src={song().coverUrl}
										alt={song().title}
										{...stylex.attrs(styles.image)}
									/>
								</div>
								<div {...stylex.attrs(styles.text)}>
									<h4 {...stylex.attrs(styles.title)}>{song().title}</h4>
									<p {...stylex.attrs(styles.artist)}>{song().artist}</p>
								</div>
								<button {...stylex.attrs(styles.favorite)}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										{...stylex.attrs(styles.icon)}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
										></path>
									</svg>
								</button>
							</>
						)}
					</Show>
				</div>

				{/* 播放控制 */}
				<div {...stylex.attrs(styles.controls)}>
					<div {...stylex.attrs(styles.buttons)}>
						<button {...stylex.attrs(styles.skip)}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								{...stylex.attrs(styles.icon)}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
								></path>
							</svg>
						</button>

						<button
							{...stylex.attrs(styles.play)}
							onClick={togglePlay}
						>
							<Show
								when={isPlaying()}
								fallback={
									<svg
										xmlns="http://www.w3.org/2000/svg"
										{...stylex.attrs(styles.playIcon)}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										></path>
									</svg>
								}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									{...stylex.attrs(styles.playIcon)}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
							</Show>
						</button>

						<button {...stylex.attrs(styles.skip)}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								{...stylex.attrs(styles.icon)}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
								></path>
							</svg>
						</button>
					</div>

					<div {...stylex.attrs(styles.progress)}>
						<span {...stylex.attrs(styles.elapsed)}>
							{formatTime(currentTime())}
						</span>
						<div {...stylex.attrs(styles.track)}>
							<div
								{...stylex.attrs(styles.fill)}
								style={{
									width: `${(currentTime() / (currentSong()?.duration || 1)) * 100}%`,
								}}
							></div>
						</div>
						<span {...stylex.attrs(styles.duration)}>
							{formatTime(currentSong()?.duration || 0)}
						</span>
					</div>
				</div>

				{/* 音量控制 */}
				<div {...stylex.attrs(styles.volume)}>
					<button {...stylex.attrs(styles.volumeButton)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							{...stylex.attrs(styles.icon)}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							></path>
						</svg>
					</button>

					<div {...stylex.attrs(styles.volumeTrack)}>
						<div
							{...stylex.attrs(styles.fill)}
							style={{ width: `${volume()}%` }}
						></div>
					</div>

					<button {...stylex.attrs(styles.queue)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							{...stylex.attrs(styles.icon)}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 8h16M4 16h16"
							></path>
						</svg>
					</button>
				</div>
			</div>
		</div>
	)
}
