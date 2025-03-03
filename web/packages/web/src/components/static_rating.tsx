import { Index, Match, Switch } from "solid-js"
import { StarIcon } from "solid-radix-icons"

export function RatingStatic(props: { rating: number }) {
  // const starLeftClass = "mask mask-star-2 mask-half-1 bg-gray-500";
  // const starLeftClassHighLight = "mask mask-star-2 mask-half-1 bg-marisa-400";
  // const starRightClass = "mask mask-star-2 mask-half-2 bg-gray-500";
  // const starRightClassHighLight =
  // 	"mask mask-star-2 mask-half-2 bg-marisa-400";
  return (
    <div class="flex">
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
  )
}
