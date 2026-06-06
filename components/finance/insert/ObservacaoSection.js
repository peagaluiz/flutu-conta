import React from "react";
import { Controller } from "react-hook-form";
import { Grid, GridItem } from "@/components/ui/grid";
import { MaskedFormTextArea } from "@/components/ui/textarea/MaskedFormTextArea";

export function ObservacaoSection({
	control,
	errors,
	isDarkMode,
	themeColors,
}) {
	const inputContainerStyle = {
		borderColor: themeColors?.borderStrong,
		backgroundColor: themeColors?.surface,
	};

	return (
		<Grid
			className="grid w-full rounded-md border p-5 gap-x-5 gap-y-2 mb-4"
			style={{
				minHeight: "auto",
				flexDirection: "row",
				backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
				borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
			}}
		>
			<GridItem _extra={{ className: "col-span-12" }}>
				<Controller
					control={control}
					name="observacao"
					render={({ field: { onChange, onBlur, value } }) => (
						<MaskedFormTextArea
							label="Observação (opcional)"
							value={value}
							onChange={onChange}
							onBlur={onBlur}
							error={errors.observacao}
							inputContainerStyle={inputContainerStyle}
							isRequired={false}
						/>
					)}
				/>
			</GridItem>
		</Grid>
	);
}
