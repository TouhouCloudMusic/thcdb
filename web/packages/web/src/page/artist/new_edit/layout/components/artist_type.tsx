import { Field } from "@modular-forms/solid"
import { FormUI } from "~/component/form/ui"
import { useController } from "../../context"
import { h4Class } from "../style"

export function ArtistType() {
	const { formStore, artistType, t } = useController()
	return (
		<div class="flex flex-col">
			<h4 class={h4Class}>{t("artist_type.label")}</h4>
			<Field
				of={formStore()}
				name="artist_type">
				{(field, props) => (
					<>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_person"
								value="Person"
								checked={field.value === "Person"}
								onChange={() => artistType.toPerson()}
							/>
							<label for="artist_type_person">{t("artist_type.person")}</label>
						</div>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_group"
								value="Group"
								checked={field.value === "Group"}
								onChange={() => artistType.toGroup()}
							/>
							<label for="artist_type_group">{t("artist_type.group")}</label>
						</div>
						{field.error && <FormUI.ErrorText text={field.error} />}
					</>
				)}
			</Field>
		</div>
	)
}
