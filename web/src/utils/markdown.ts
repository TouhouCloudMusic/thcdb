import {
	transformerNotationDiff,
	transformerNotationHighlight,
	transformerNotationWordHighlight,
	transformerNotationFocus,
	transformerNotationErrorLevel,
	transformerMetaHighlight,
	transformerMetaWordHighlight,
} from "@shikijs/transformers"
import { Marked } from "marked"
import markedFootnote from "marked-footnote"
import markedShiki from "marked-shiki"
import { createHighlighter, type LanguageInput } from "shiki"
import { createResource, createRoot } from "solid-js"

type Markdown = {
	render(text: string): Promise<string>
}

// import Markdownit from "markdown-it"
// import footNote from "markdown-it-footnote"
// import taskList from "markdown-it-task-lists"

// const FOOTNOTE_RULES = {
// 	footnote_anchor: ["", `<-`],
// } as const

// function createMdit() {
// 	let inst: Markdown | undefined

// 	return async () => {
// 		if (!inst) {
// 			const mdit = Markdownit()

// 			mdit.use(footNote)

// 			Object.entries(FOOTNOTE_RULES).map(([key, value]) => {
// 				let defaultRender = mdit.renderer.rules[key]!
// 				mdit.renderer.rules[key] = (tokens, idx, options, env, self) => {
// 					return defaultRender(tokens, idx, options, env, self).replace(
// 						...value,
// 					)
// 				}
// 			})

// 			mdit.use(taskList)
// 			const Shiki = (await import("@shikijs/markdown-it")).default
// 			mdit.use(
// 				await Shiki({
// 					themes: {
// 						dark: "catppuccin-latte",
// 						light: "catppuccin-mocha",
// 					},
// 				}),
// 			)

// 			inst = {
// 				// eslint-disable-next-line @typescript-eslint/require-await
// 				async render(text: string) {
// 					return mdit.render(text)
// 				},
// 			}
// 		}

// 		return inst
// 	}
// }

async function createMarked() {
	const highlighter = await createHighlighter({
		langs: [],
		themes: ["catppuccin-latte", "catppuccin-mocha"],
	})

	const marked = new Marked({
		async: true,
		gfm: true,
	})
		.use(
			markedShiki({
				async highlight(code, lang, props) {
					if (!highlighter.getLoadedLanguages().some((l) => l === lang)) {
						await highlighter.loadLanguage(lang as unknown as LanguageInput)
					}
					return highlighter.codeToHtml(code, {
						lang,
						themes: {
							dark: "catppuccin-latte",
							light: "catppuccin-mocha",
						},
						meta: { __raw: props.join(" ") },
						transformers: [
							transformerNotationDiff({
								matchAlgorithm: "v3",
							}),
							transformerNotationHighlight({
								matchAlgorithm: "v3",
							}),
							transformerNotationWordHighlight({
								matchAlgorithm: "v3",
							}),
							transformerNotationFocus({
								matchAlgorithm: "v3",
							}),
							transformerNotationErrorLevel({
								matchAlgorithm: "v3",
							}),
							transformerMetaHighlight(),
							transformerMetaWordHighlight(),
						],
					})
				},
			}),
		)
		.use(markedFootnote())

	return {
		async render(text: string) {
			return marked.parse(text)
		},
	} as Markdown
}

export const useMarkdown = createRoot(() => {
	const [mdit] = createResource(createMarked)

	return () => mdit
})
