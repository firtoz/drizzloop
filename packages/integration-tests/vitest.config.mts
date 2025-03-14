import {
	defineWorkersConfig,
	type WorkersUserConfigExport,
} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import fs from "node:fs";
const exampleDoPath = path.resolve("../../durable-objects/example-do/");

import ExampleDOWranglerConfig from "../../durable-objects/example-do/wrangler.json";

export default defineWorkersConfig({
	test: {
		fileParallelism: false,
		globalSetup: "./global-setup.ts",
		poolOptions: {
			workers: {
				singleWorker: true,
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
							durableObjects: {
								className: "ExampleDO",
								scriptName: "example-do-local",
							},
							bindings: {
								ENV: "local",
							},
						},
					],
				},
			},
		},
	},
} satisfies WorkersUserConfigExport);
