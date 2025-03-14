import { BaseWebSocketDO } from "@greybox/durable-object-helpers/BaseWebSocketDO";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "cloudflare-worker-config";
import { Hono, type TypedResponse } from "hono";
import { z } from "zod";
import { ExampleSession } from "./ExampleSession";

type Super = BaseWebSocketDO<Env, ExampleSession>;

export class ExampleDO extends BaseWebSocketDO<Env, ExampleSession> {
	app = this.getBaseApp()
		.get("/", (c) => {
			return c.text(
				`GET: Hello World from the Example Durable Object. Env: ${c.env.ENV}`,
			);
		})
		.post(
			"/test",
			zValidator(
				"json",
				z.object({
					/**
					 * This is a temporary name to test the data.
					 */
					name: z.string(),
				}),
			),
			async (
				c,
			): Promise<
				TypedResponse<{
					/**
					 * This is a temporary message to test the data.
					 */
					message: string;
				}>
			> => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return c.json({
					message: `POST: Hello ${c.req.valid("json").name} from the Example Durable Object.`,
				});
			},
		);

	protected createSession: Super["createSession"] = (websocket) => {
		return new ExampleSession(websocket, this.sessions);
	};
}

export default {
	fetch: new Hono().get("/", (c) => {
		return c.text("OK");
	}).fetch,
} satisfies ExportedHandler<Env>;
