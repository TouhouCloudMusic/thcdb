declare module "markdown-it-task-lists" {
	import type MarkdownIt from "markdown-it"
	function plugin(md: MarkdownIt): void

	export default plugin
}
