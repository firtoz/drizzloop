export type ExamplePointer = {
	pointerId: number;
	x: number;
	y: number;
	isActive: boolean;
};

export type ExampleLiveParticipant = {
	id: string;
	color: string;
	pointers: ExamplePointer[];
};

export type ExampleClientMessage =
	| {
			type: "join";
	  }
	| {
			type: "pointerUpdate";
			pointers: ExamplePointer[];
	  };
export type ExampleServerMessage =
	| {
			type: "welcome";
			participants: ExampleLiveParticipant[];
	  }
	| {
			type: "joined";
			participant: ExampleLiveParticipant;
	  }
	| {
			type: "updated";
			participant: ExampleLiveParticipant;
	  }
	| {
			type: "left";
			id: string;
	  };
