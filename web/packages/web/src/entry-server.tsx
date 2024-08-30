// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"
import * as init from "./state/initialization"

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
							<link
								rel="preconnect"
								href="https://fonts.googleapis.com"
							/>
							<link
								rel="preconnect"
								href="https://fonts.gstatic.com"
								crossorigin=""
							/>
							<link
								href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap"
								rel="stylesheet"
							/>
							{assets}
						</head>
						<body>
							<div id="app">{children}</div>
							{scripts}
						</body>
					</html>
				)}
			/>
		)
	},
	{ mode: "async" }
)
