import { HoverCard } from "@ark-ui/solid";
import { createSignal } from "solid-js";
import { Portal } from "solid-js/web";

export function EditComp() {
	const [open, setOpen] = createSignal(false);
	const itemClass = "px-2 py-1";
	return (
		<HoverCard.Root
			open={open()}
			onOpenChange={() => setOpen(false)}
			positioning={{ placement: "bottom-end", gutter: 11 }}
			openDelay={200}
			closeDelay={200}>
			<HoverCard.Trigger class="text-sm text-gray-600 hover:text-gray-600/70">
				Edit
			</HoverCard.Trigger>
			<Portal>
				<HoverCard.Positioner>
					<HoverCard.Content class="w-fit">
						<ul class="flex flex-col divide-y-[0.125rem] rounded-[0.5rem] border-[0.125rem] border-zinc-200 bg-white">
							<li class={itemClass}>
								<a class="text-nowrap">Edit This Page</a>
							</li>
							<li class={itemClass}>
								<a>History</a>
							</li>
						</ul>
					</HoverCard.Content>
				</HoverCard.Positioner>
			</Portal>
		</HoverCard.Root>
	);
}
