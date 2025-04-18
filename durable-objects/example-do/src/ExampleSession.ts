import { BaseSession } from "@greybox/durable-object-helpers/BaseSession";
import type { Env } from "cloudflare-worker-config";
import ColorJS from "color";
import { v7 } from "uuid";
import type {
	ExampleClientMessage,
	ExampleLiveParticipant,
	ExampleServerMessage,
} from "./types";

type Super = BaseSession<
	Env,
	ExampleLiveParticipant,
	ExampleServerMessage,
	ExampleClientMessage
>;

export class ExampleSession extends BaseSession<
	Env,
	ExampleLiveParticipant,
	ExampleServerMessage,
	ExampleClientMessage
> {
	protected createData: Super["createData"] = (
		_ctx,
	): ExampleLiveParticipant => {
		return {
			id: v7(),
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

				const welcomeMessage: ExampleServerMessage = {
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
