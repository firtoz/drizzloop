import { BaseSession } from "@greybox/durable-object-helpers/BaseSession";
import type { Env } from "cloudflare-worker-config";
import ColorJS from "color";
import type { ClientMessage, LiveParticipant, ServerMessage } from "./types";

type Super = BaseSession<Env, LiveParticipant, ServerMessage, ClientMessage>;

export class ExampleSession extends BaseSession<
	Env,
	LiveParticipant,
	ServerMessage,
	ClientMessage
> {
	protected createData: Super["createData"] = (_ctx): LiveParticipant => {
		return {
			id: crypto.randomUUID(),
			color: ColorJS.hsl(Math.random() * 360, 50, 50)
				.rgb()
				.string(),
			pointers: [],
		};
	};

	handleMessage: Super["handleMessage"] = async (message) => {
		switch (message.type) {
			case "join": {
				this.broadcast(
					{
						type: "joined",
						participant: this.data,
					},
					true,
				);

				const welcomeMessage: ServerMessage = {
					type: "welcome",
					participants: Array.from(this.sessions.values())
						.filter((s) => s !== this)
						.map((s) => s.data),
				};

				this.send(welcomeMessage);
				break;
			}
			case "pointerUpdate": {
				this.data.pointers = message.pointers;

				this.update();

				this.broadcast(
					{
						type: "updated",
						participant: this.data,
					},
					true,
				);
				break;
			}
		}
	};

	handleClose: Super["handleClose"] = async () => {
		this.data.pointers = [];

		this.broadcast(
			{
				type: "left",
				id: this.data.id,
			},
			true,
		);
	};

	handleBufferMessage: Super["handleBufferMessage"] = async (_message) => {};
}
