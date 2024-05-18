import { StarIcon } from "lucide-solid";
import { Index, Match, Show, Switch } from "solid-js";

export function RatingStatic(props: { rating: number }) {
	const arr5 = new Array(5);
	const arr10 = new Array(10);
	// const starLeftClass = "mask mask-star-2 mask-half-1 bg-zinc-500";
	// const starLeftClassHighLight = "mask mask-star-2 mask-half-1 bg-yellow-400";
	// const starRightClass = "mask mask-star-2 mask-half-2 bg-zinc-500";
	// const starRightClassHighLight =
	// 	"mask mask-star-2 mask-half-2 bg-yellow-400";
	return (
		<div class="flex">
			<Index each={arr5}>
				{(_item, index) => (
					<Switch
						fallback={
							<StarIcon
								fill="gray"
								color="transparent"
							/>
						}>
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
		// <div class="rating rating-lg rating-half">
		// 	<input
		// 		type="radio"
		// 		name="rating-10"
		// 		class="rating-hidden"
		// 	/>
		// 	<Index each={arr}>
		// 		{(item, index) => (
		// 			<Switch>
		// 				<Match when={index < props.rating && index % 2 === 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starLeftClassHighLight}
		// 						disabled
		// 					/>
		// 				</Match>
		// 				<Match when={index < props.rating && index % 2 !== 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starRightClassHighLight}
		// 						disabled
		// 					/>
		// 				</Match>
		// 				<Match when={index === props.rating && index % 2 === 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starLeftClassHighLight}
		// 						disabled
		// 					/>
		// 				</Match>
		// 				<Match when={index === props.rating && index % 2 !== 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starRightClassHighLight}
		// 						disabled
		// 					/>
		// 				</Match>
		// 				<Match when={index > props.rating && index % 2 === 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starLeftClass}
		// 						disabled
		// 					/>
		// 				</Match>
		// 				<Match when={index > props.rating && index % 2 !== 0}>
		// 					<input
		// 						type="radio"
		// 						name="rating-10"
		// 						class={starRightClass}
		// 						disabled
		// 					/>
		// 				</Match>
		// 			</Switch>
		// 		)}
		// 	</Index>
		// </div>
	);
}
