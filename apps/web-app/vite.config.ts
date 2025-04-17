import path from "node:path";
import { WranglerConfigHelper } from "@greybox/wrangler-config-helper";
import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { type UserConfig, defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }): UserConfig => {
	const workerAppDir = path.resolve(__dirname, "../worker-app");
	const wranglerPath = path.resolve(workerAppDir, "wrangler.json");

	const wranglerEnvironment = "local";
	const patchedWranglerConfigPath = new WranglerConfigHelper(
		wranglerPath,
	).prepareEnvironmentConfig(wranglerEnvironment);

	return {
		build: {
			rollupOptions: isSsrBuild
				? {
						input: path.resolve(workerAppDir, "src/server.ts"),
						external: ["cloudflare:workers"],
					}
				: {},
		},
		ssr: {
			target: "webworker",
			resolve: {
				conditions: ["workerd", "browser"],
			},
			optimizeDeps: {
				include: [
					"react",
					"react/jsx-runtime",
					"react/jsx-dev-runtime",
					"react-dom",
					"react-dom/server",
					"react-router",
				],
			},
		},
		plugins: [
			VitePWA({
				registerType: "prompt",
				injectRegister: "auto",
				strategies: "injectManifest",
				srcDir: "app",
				filename: "sw.ts",
				manifest: {
					name: "DrizzLoop Web App",
					short_name: "DrizzLoop",
					description: "A progressive web app built with Drizzle",
					theme_color: "#000000",
					icons: [
						{
							src: "/logo-light.png",
							sizes: "192x192",
							type: "image/png",
						},
						{
							src: "/logo-dark.png",
							sizes: "512x512",
							type: "image/png",
						},
					],
				},
				devOptions: {
					enabled: true,
					type: "module",
				},
				workbox: {
					globPatterns: [
						"**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot,wasm,mjs}",
					],
					navigateFallbackDenylist: [/^index.html$/],
					// additionalManifestEntries: [
					// 	{
					// 		url: "/worker.js",
					// 		revision: `${Date.now()}`,
					// 	},
					// ],
				},
			}),
			tailwindcss(),
			cloudflareDevProxy({
				configPath: patchedWranglerConfigPath,
				environment: wranglerEnvironment,
				persist: {
					path: path.resolve(workerAppDir, ".wrangler/state/v3"),
				},
			}),
			reactRouter(),
			tsconfigPaths(),
		],
		resolve: {
			mainFields: ["browser", "module", "main"],
			alias: [
				{
					// Alias all .sql imports to .sql?raw
					find: /\.sql$/,
					replacement: ".sql?raw",
				},
			],
		},
		esbuild: {
			target: "es2022",
		},
		optimizeDeps: {
			exclude: ["@sqlite.org/sqlite-wasm"],
		},
		server: {
			headers: {
				"Cross-Origin-Opener-Policy": "same-origin",
				"Cross-Origin-Embedder-Policy": "require-corp",
				"Cross-Origin-Resource-Policy": "cross-origin",
			},
			host: "0.0.0.0",
			hmr: {
				clientPort: 5175,
				port: 5175,
			},
			proxy: {
				"/websocket": {
					ws: true,
					changeOrigin: true,
					target: "ws://localhost:8787",
				},
			},
		},
		assetsInclude: ["**/*.wasm"],
	} satisfies UserConfig;
});
