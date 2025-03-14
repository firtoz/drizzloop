export type Pointer = {
	pointerId: number;
	x: number;
	y: number;
	isActive: boolean;
};
export type LiveParticipant = {
	id: string;
	color: string;
	pointers: Pointer[];
};
export type ClientMessage =
	| {
			type: "join";
	  }
	| {
			type: "pointerUpdate";
			pointers: Pointer[];
	  };
export type ServerMessage =
	| {
			type: "welcome";
			participants: LiveParticipant[];
	  }
	| {
			type: "joined";
			participant: LiveParticipant;
	  }
	| {
			type: "updated";
			participant: LiveParticipant;
	  }
	| {
			type: "left";
			id: string;
	  };
