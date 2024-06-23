import { Accessor, Index, Match, Setter, Switch, createSignal } from "solid-js"
import { RatingGroup } from "@ark-ui/solid"
import { StarIcon } from "solid-radix-icons"

export function UserActionComp() {
	const itemClass =
			"bg-gray-200/70 size-fit rounded-[0.1rem] py-1 px-2 border-gray-400 text-gray-600",
		itemStyle = {
			// "border-radius": "0.1rem",
		},
		itemProps = {
			class: itemClass,
			style: itemStyle,
		}
	const [rate, setRate] = createSignal(3.5)
	function RatingComp(props: {
		rate: Accessor<number>
		setRate: Setter<number>
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
					<RatingGroup.Context>
						{(context) => (
							<Index each={context().items}>
								{(index) => (
									<RatingGroup.Item
										index={index()}
										class="ratingItem">
										<RatingGroup.ItemContext>
											{(context) => (
												<Switch
													fallback={
														<StarIcon
															fill="gray"
															color="transparent"
														/>
													}>
													<Match when={context().highlighted}>
														<StarIcon
															fill="orange"
															color="transparent"
														/>
													</Match>
												</Switch>
											)}
										</RatingGroup.ItemContext>
									</RatingGroup.Item>
								)}
							</Index>
						)}
					</RatingGroup.Context>
				</RatingGroup.Control>
			</RatingGroup.Root>
		)
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
	)
}
