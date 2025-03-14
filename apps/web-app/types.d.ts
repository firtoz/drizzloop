import type { ServerBuild } from "react-router";

declare module "web-app" {
	export const mode: ServerBuild["mode"];
	export const entry: ServerBuild["entry"];
	export const routes: ServerBuild["routes"];
	export const assets: ServerBuild["assets"];
	export const basename: ServerBuild["basename"];
	export const publicPath: ServerBuild["publicPath"];
	export const assetsBuildDirectory: ServerBuild["assetsBuildDirectory"];
	export const future: ServerBuild["future"];
	export const isSpaMode: ServerBuild["isSpaMode"];
}
