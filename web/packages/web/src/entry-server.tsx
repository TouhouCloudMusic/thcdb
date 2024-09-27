// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"
import * as init from "./state/initialization"

const Font = () => (
	<>
		{/* Inter */}
		<style>
			@import
			url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
		</style>
		{/* Noto Sans SC */}
		<style>
			@import
			url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');
		</style>
	</>
)
export default createHandler(
	() => {
		return (
			<StartServer
				document={({ assets, children, scripts }) => (
					<html
						lang={init.lang()}
						data-mode={init.theme()}>
						<head>
							<meta charset="utf-8" />
							<meta
								name="viewport"
								content="width=device-width, initial-scale=1"
							/>
							<link
								rel="icon"
								href="/logo.svg"
							/>
							{assets}
						</head>
						<body>
							<div id="app">{children}</div>
							{scripts}
						</body>
						<Font />
					</html>
				)}
			/>
		)
	},
	{ mode: "async" }
)
