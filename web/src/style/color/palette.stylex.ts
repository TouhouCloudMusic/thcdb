import * as stylex from "@stylexjs/stylex"

export const slate = stylex.defineConsts({
	100: "#f6f7f8",
	200: "#eff0f1",
	300: "#d5d7db",
	400: "#c0c3c8",
	500: "#a0a4ab",
	600: "#7c8088",
	700: "#595c64",
	800: "#3a3d44",
	900: "#1b1e25",
})

export const reimu = stylex.defineConsts({
	100: "#fff0ef",
	200: "#fce1df",
	300: "#ffcac6",
	400: "#ff9e99",
	500: "#f76467",
	600: "#de444b",
	650: "color-mix(in oklch, #de444b 50%, #f76467 50%)",
	700: "#a82c32",
	800: "#6f1c1b",
	900: "#3d0c07",
})

export const blue = stylex.defineConsts({
	100: "#edf4ff",
	200: "#deeaff",
	300: "#c4d9fd",
	400: "#96baff",
	500: "#719cfb",
	600: "#4e76e2",
	700: "#2755c7",
	800: "#06328c",
	900: "#011446",
})

export const marisa = stylex.defineConsts({
	100: "#fbf3d1",
	200: "#f7eab8",
	300: "#edd698",
	400: "#d9b468",
	500: "#c79c49",
	600: "#a57911",
	700: "#845d11",
	800: "#553a07",
	900: "#261803",
})

export const green = stylex.defineConsts({
	100: "#dcfce6",
	200: "#c0f6d2",
	300: "#92eaad",
	400: "#62cf7d",
	500: "#2fb459",
	600: "#00903a",
	700: "#006b28",
	800: "#004616",
	900: "#002206",
})

export const palette = {
	blue,
	green,
	marisa,
	reimu,
	slate,
	black: "black",
	white: "white",
}
