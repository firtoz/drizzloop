import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["@vitest/web-worker"],
		include: ["src/**/*.test.ts"],
		globals: true,
	},
	resolve: {
		alias: [
			{
				// Alias all .sql imports to .sql?raw
				find: /\.sql$/,
				replacement: ".sql?raw",
			},
		],
	},
});
