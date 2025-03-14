import path from "node:path";
import { WranglerConfigHelper } from "@greybox/wrangler-config-helper";
import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { type UserConfig, defineConfig } from "vite";
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
				: undefined,
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
			tailwindcss(),
			cloudflareDevProxy({
				configPath: patchedWranglerConfigPath,
				environment: wranglerEnvironment,
				persist: {
					path: path.resolve(workerAppDir, ".wrangler/state/v3"),
				},
			}),
			// vitePluginViteNodeMiniflare({
			// 	entry: "../worker-app/src/server.ts",
			// 	miniflareOptions: (options) => {
			// 	  options.compatibilityDate = "2024-11-18";
			// 		options.compatibilityFlags = ["nodejs_compat"];
			// 		options.durableObjects = {
			// 			EXAMPLE_DO: {
			// 				className: "ExampleDO",
			// 			},
			// 		};
			// 	},
			// }),
			reactRouter(),
			tsconfigPaths(),
		],
		resolve: {
			mainFields: ["browser", "module", "main"],
		},
		esbuild: {
			target: "es2022",
		},
		server: {
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
	} satisfies UserConfig;
});
