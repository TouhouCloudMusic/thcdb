import * as stylex from "@stylexjs/stylex"
import { StarIcon } from "@thc/icons/radix"
import { Index, Match, Switch } from "solid-js"

const styles = stylex.create({
	rating: { display: "flex" },
})

export function RatingStatic(props: { rating: number }) {
	return (
		<div {...stylex.attrs(styles.rating)}>
			<Index each={Array.from({ length: 5 })}>
				{(_item, index) => (
					<Switch
						fallback={
							<StarIcon
								fill="gray"
								color="transparent"
							/>
						}
					>
						<Match when={index < props.rating}>
							<StarIcon
								fill="orange"
								color="transparent"
							/>
						</Match>
					</Switch>
				)}
			</Index>
		</div>
	)
}
