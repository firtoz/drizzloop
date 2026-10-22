import { SELF, env } from "cloudflare:test";
import type { Env as WorkerEnv } from "cloudflare-worker-config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExampleServerMessage as ServerMessage } from "../../../durable-objects/example-do/src/types";

declare global {
	namespace Cloudflare {
		interface Env extends WorkerEnv {}
	}
}

describe("Worker Integration Tests", () => {
	describe("Basic Request Handling", () => {
		it("should handle basic request", async () => {
			const req = new Request("http://localhost/");
			const res = await SELF.fetch(req);
			expect(res.status).toBe(200);
		});

		it("should handle different HTTP methods", async () => {
			const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
			for (const method of methods) {
				const res = await SELF.fetch("http://localhost/", { method });
				expect(res.status).toBe(200);
			}
		});
	});

	describe("Example Durable Object", () => {
		let stub: DurableObjectStub;

		beforeEach(() => {
			stub = env.EXAMPLE_DO.get(
				env.EXAMPLE_DO.idFromName(`test-${crypto.randomUUID()}`),
			);
		});

		it("should handle GET request", async () => {
			const res = await stub.fetch("http://localhost/");
			expect(res.status).toBe(200);
			expect(await res.text()).toBe(
				"GET: Hello World from the Example Durable Object. Env: local",
			);
		});

		it("should handle POST request", async () => {
			const res = await stub.fetch("http://localhost/test", {
				method: "POST",
				body: JSON.stringify({ name: "John" }),
				headers: { "Content-Type": "application/json" },
			});

			const responseData = JSON.parse(await res.text());
			expect(responseData).toEqual({
				message: "POST: Hello John from the Example Durable Object.",
			});
			expect(res.status).toBe(200);
		});
	});

	describe("Example Durable Object WebSocket", () => {
		let stub: DurableObjectStub;
		let ws1: WebSocket;
		let ws2: WebSocket;
		let messages1: ServerMessage[] = [];
		let messages2: ServerMessage[] = [];

		beforeEach(() => {
			stub = env.EXAMPLE_DO.get(
				env.EXAMPLE_DO.idFromName(`test-${crypto.randomUUID()}`),
			);
			messages1 = [];
			messages2 = [];
		});

		afterEach(async () => {
			await Promise.all(
				[ws1, ws2].map((socket) => {
					if (!socket || socket.readyState === WebSocket.CLOSED) return;
					return new Promise<void>((resolve, reject) => {
						const timer = setTimeout(
							() => reject(new Error("WebSocket cleanup timed out")),
							5000,
						);
						socket.addEventListener(
							"close",
							() => {
								clearTimeout(timer);
								resolve();
							},
							{ once: true },
						);
						if (socket.readyState === WebSocket.OPEN) socket.close();
					});
				}),
			);
		});

		async function setupWebSocket(response: Response): Promise<WebSocket> {
			expect(response.status).toBe(101);
			const ws = response.webSocket as WebSocket;
			expect(ws).toBeDefined();
			expect(ws).not.toBeNull();
			expect(ws.readyState).toBe(WebSocket.OPEN);
			return ws;
		}

		it("should handle WebSocket connections and client interactions", async () => {
			const response1 = await stub.fetch("http://example.com/websocket", {
				headers: { upgrade: "websocket" },
			});

			const response2 = await stub.fetch("http://example.com/websocket", {
				headers: { upgrade: "websocket" },
			});

			ws1 = await setupWebSocket(response1);
			ws2 = await setupWebSocket(response2);

			ws1.addEventListener("message", (event) => {
				messages1.push(JSON.parse(event.data));
			});

			ws2.addEventListener("message", (event) => {
				messages2.push(JSON.parse(event.data));
			});

			ws1.accept();
			ws2.accept();

			// Client interactions
			ws1.send(JSON.stringify({ type: "join" }));
			ws2.send(JSON.stringify({ type: "join" }));

			const pointers = [{ x: 100, y: 100 }];
			ws1.send(JSON.stringify({ type: "pointerUpdate", pointers }));
			await vi.waitFor(() => {
				expect(messages2.some((m) => m.type === "joined")).toBe(true);
				expect(messages2.some((m) => m.type === "updated")).toBe(true);
				expect(messages1.some((m) => m.type === "welcome")).toBe(true);
			});
		});

		it("should handle disconnections and verify message contents", async () => {
			const response1 = await stub.fetch("http://example.com/websocket", {
				headers: { upgrade: "websocket" },
			});
			const response2 = await stub.fetch("http://example.com/websocket", {
				headers: { upgrade: "websocket" },
			});

			ws1 = await setupWebSocket(response1);
			ws2 = await setupWebSocket(response2);

			ws1.addEventListener("message", (event) => {
				messages1.push(JSON.parse(event.data));
			});

			ws2.addEventListener("message", (event) => {
				messages2.push(JSON.parse(event.data));
			});

			ws1.accept();
			ws2.accept();

			// Test client joining
			ws1.send(JSON.stringify({ type: "join" }));
			await vi.waitFor(() =>
				expect(messages2.some((m) => m.type === "joined")).toBe(true),
			);

			const joinedMessage = messages2.find(
				(m) => m.type === "joined",
			) as ServerMessage & {
				type: "joined";
			};
			expect(joinedMessage).toBeDefined();
			expect(joinedMessage.participant).toHaveProperty("id");
			expect(joinedMessage.participant).toHaveProperty("color");
			expect(joinedMessage.participant.pointers).toEqual([]);

			// Test second client joining
			ws2.send(JSON.stringify({ type: "join" }));
			await vi.waitFor(() =>
				expect(messages1.some((m) => m.type === "welcome")).toBe(true),
			);

			const welcomeMessage = messages1.find(
				(m) => m.type === "welcome",
			) as ServerMessage & {
				type: "welcome";
			};
			expect(welcomeMessage).toBeDefined();
			expect(Array.isArray(welcomeMessage.participants)).toBe(true);

			// Test disconnection
			ws1.close();
			await vi.waitFor(() =>
				expect(messages2.some((m) => m.type === "left")).toBe(true),
			);

			const leftMessage = messages2.find(
				(m) => m.type === "left",
			) as ServerMessage & {
				type: "left";
			};
			expect(leftMessage).toBeDefined();
			expect(leftMessage.id).toBe(joinedMessage.participant.id);
		});
	});
});
