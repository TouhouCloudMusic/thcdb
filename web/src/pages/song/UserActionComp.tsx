import { Accessor, Index, Match, Setter, Switch, createSignal } from "solid-js";
import { StarIcon } from "lucide-solid";
import { RatingGroup } from "@ark-ui/solid";

export function UserActionComp() {
	const itemClass =
		"bg-zinc-200/70 size-fit rounded-[0.1rem] py-1 px-2 border-zinc-400 text-zinc-600";
	const itemStyle = {
		// "border-radius": "0.1rem",
	};
	const itemProps = {
		class: itemClass,
		style: itemStyle,
	};
	const [rate, setRate] = createSignal(3.5);
	function RatingComp(props: {
		rate: Accessor<number>;
		setRate: Setter<number>;
	}) {
		return (
			<RatingGroup.Root
				count={5}
				value={props.rate()}
				onValueChange={(details) => props.setRate(details.value)}
				class={itemClass}
				allowHalf>
				{/* <RatingGroup.Label>Label</RatingGroup.Label> */}
				<RatingGroup.Control class="flex">
					{(context) => (
						<Index each={context().items}>
							{(index) => (
								<RatingGroup.Item
									index={index()}
									class="ratingItem">
									{(context) => (
										<Switch
											fallback={
												<StarIcon
													fill="gray"
													color="transparent"
												/>
											}>
											<Match
												when={context().isHighlighted}>
												<StarIcon
													fill="orange"
													color="transparent"
												/>
											</Match>
										</Switch>
									)}
								</RatingGroup.Item>
							)}
						</Index>
					)}
				</RatingGroup.Control>
			</RatingGroup.Root>
		);
	}

	return (
		<>
			<div class="grid w-fit grid-flow-col items-center justify-center gap-1">
				<RatingComp
					rate={rate}
					setRate={setRate}
				/>
				<button {...itemProps}>Catalog</button>
				<button {...itemProps}>Review</button>
				<button {...itemProps}>Tag</button>
			</div>
		</>
	);
}
