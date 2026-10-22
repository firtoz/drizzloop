import path from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import ExampleDOWranglerConfig from "../../durable-objects/example-do/wrangler.json";
const exampleDoPath = path.resolve("../../durable-objects/example-do/");

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: {
				configPath: "../../apps/worker-app/wrangler.json",
				environment: "local",
			},
			miniflare: {
				workers: [
					{
						name: "example-do-local",
						modules: true,
						modulesRoot: path.resolve("../.."),
						scriptPath: path.join(exampleDoPath, "dist/ExampleDO.js"),
						compatibilityDate: ExampleDOWranglerConfig.compatibility_date,
						compatibilityFlags: ExampleDOWranglerConfig.compatibility_flags,
						durableObjects: { EXAMPLE_DO: { className: "ExampleDO" } },
						bindings: { ENV: "local" },
					},
				],
			},
		}),
	],
	test: {
		fileParallelism: false,
		maxWorkers: 1,
		globalSetup: "./global-setup.ts",
	},
});
