import { WorkerEntrypoint } from "cloudflare:workers";
import { honoDoFetcherWithName } from "@greybox/hono-typed-fetcher/honoDoFetcher";
import type { Env } from "cloudflare-worker-config";
import { Hono } from "hono";
import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
	async () => {
		// @ts-expect-error - virtual module provided by React Router at build time
		return import("virtual:react-router/server-build").catch(() => {
			return null;
		});
	},
	import.meta.env?.MODE,
);

const app = new Hono<{
	Bindings: Env & {
		ASSETS: Fetcher;
	};
}>()
	.get("/websocket", async (c): Promise<Response> => {
		const fetcher = honoDoFetcherWithName(c.env.EXAMPLE_DO, "default");
		return fetcher.get({
			url: "/websocket",
			init: c.req.raw,
		}) as unknown as Response;
	})
	.all("*", async (c, next) => {
		try {
			const { req, env } = c;

			if (env.ENV === "local") {
				return c.text("OK");
			}

			let response: Response | undefined;
			try {
				response = await env.ASSETS.fetch(req.url, req.raw.clone());
				response =
					response && response.status >= 200 && response.status < 400
						? new Response(response.body, response)
						: undefined;
			} catch {}

			if (!response) {
				return await next();
			}

			return response;
		} catch (error) {
			console.error("root error", error);
			return c.text("An unexpected error occurred", { status: 500 });
		}
	})
	.all("*", async (c) => {
		const { req, env } = c;

		const waitUntil = c.executionCtx.waitUntil.bind(c.executionCtx);
		const passThroughOnException = c.executionCtx.passThroughOnException.bind(
			c.executionCtx,
		);

		let response: Response | undefined;
		try {
			const loadContext = {
				cloudflare: {
					cf: req.raw.cf,
					ctx: { waitUntil, passThroughOnException },
					caches,
					env,
				},
			};
			response = await requestHandler(req.raw, loadContext);
		} catch (error) {
			console.error("root error", error);
			response = c.text("An unexpected error occurred", { status: 500 });
		}

		return response;
	});

export default class Server extends WorkerEntrypoint<Env> {
	override fetch(request: Request) {
		return app.fetch(request, this.env, this.ctx);
	}
}
