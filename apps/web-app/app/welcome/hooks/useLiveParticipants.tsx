import type {
	ClientMessage,
	LiveParticipant,
	Pointer,
	ServerMessage,
} from "example-do/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useLiveParticipants = () => {
	const [participants, setParticipants] = useState<
		Map<string, LiveParticipant>
	>(new Map());
	const activePointers = useRef<Pointer[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	const getRelativePointerPosition = useCallback(
		(clientX: number, clientY: number) => {
			const logoRect = containerRef.current?.getBoundingClientRect();
			if (!logoRect)
				return { x: clientX + window.scrollX, y: clientY + window.scrollY };

			return {
				x: clientX - logoRect.left,
				y: clientY - logoRect.top,
			};
		},
		[],
	);

	const websocket = useMemo(() => {
		if (typeof document === "undefined") {
			return null;
		}

		const ws = new WebSocket("/websocket");

		ws.onmessage = (event) => {
			const parsed = JSON.parse(event.data) as ServerMessage;
			switch (parsed.type) {
				case "welcome":
					setParticipants(new Map(parsed.participants.map((p) => [p.id, p])));
					break;
				case "joined":
					setParticipants((prev) =>
						new Map(prev).set(parsed.participant.id, parsed.participant),
					);
					break;
				case "updated":
					setParticipants((prev) =>
						new Map(prev).set(parsed.participant.id, parsed.participant),
					);
					break;
				case "left":
					setParticipants((prev) => {
						const newMap = new Map(prev);
						newMap.delete(parsed.id);
						return newMap;
					});
					break;
			}
		};

		ws.onopen = () => {
			console.log("ws opened");
			ws.send(
				JSON.stringify({
					type: "join",
				} satisfies ClientMessage),
			);
		};

		ws.onclose = () => {
			console.log("ws closed");
		};

		ws.onerror = (event) => {
			console.error("ws error", event);
		};

		return ws;
	}, []);

	useEffect(() => {
		if (!websocket) {
			return;
		}

		return () => websocket.close();
	}, [websocket]);

	useEffect(() => {
		if (!websocket) {
			return;
		}

		const abortController = new AbortController();
		const signal = abortController.signal;

		let lastUpdate = 0;
		const THROTTLE_MS = 50;

		const sendPointerUpdate = (force = false) => {
			if (websocket.readyState !== WebSocket.OPEN) return;

			const now = Date.now();
			if (now - lastUpdate < THROTTLE_MS && !force) return;

			websocket.send(
				JSON.stringify({
					type: "pointerUpdate",
					pointers: activePointers.current,
				} satisfies ClientMessage),
			);
			lastUpdate = now;
		};

		const handlePointerDown = (event: PointerEvent) => {
			const { x, y } = getRelativePointerPosition(event.clientX, event.clientY);
			const pointer: Pointer = {
				pointerId: event.pointerId,
				x,
				y,
				isActive: true,
			};
			const existingIndex = activePointers.current.findIndex(
				(p) => p.pointerId === event.pointerId,
			);
			if (existingIndex >= 0) {
				activePointers.current[existingIndex] = pointer;
			} else {
				activePointers.current.push(pointer);
			}
			sendPointerUpdate(true);
		};

		const handlePointerMove = (event: PointerEvent) => {
			const { x, y } = getRelativePointerPosition(event.clientX, event.clientY);
			const existingIndex = activePointers.current.findIndex(
				(p) => p.pointerId === event.pointerId,
			);
			if (existingIndex >= 0) {
				activePointers.current[existingIndex] = {
					...activePointers.current[existingIndex],
					x,
					y,
				};
			} else {
				activePointers.current.push({
					pointerId: event.pointerId,
					x,
					y,
					isActive: false,
				});
			}
			sendPointerUpdate();
		};

		const handlePointerUp = (event: PointerEvent) => {
			const existingIndex = activePointers.current.findIndex(
				(p) => p.pointerId === event.pointerId,
			);
			if (existingIndex >= 0) {
				if (event.pointerType === "mouse") {
					activePointers.current[existingIndex].isActive = false;
				} else {
					activePointers.current = activePointers.current.filter(
						(p) => p.pointerId !== event.pointerId,
					);
				}
				sendPointerUpdate(true);
			}
		};

		const handlePointerCancel = handlePointerUp;
		const handlePointerLeave = handlePointerUp;

		document.addEventListener("pointerdown", handlePointerDown, {
			signal,
			capture: true,
			passive: false,
		});
		document.addEventListener("pointermove", handlePointerMove, {
			signal,
			capture: true,
			passive: false,
		});
		document.addEventListener("pointerup", handlePointerUp, {
			signal,
			capture: true,
			passive: false,
		});
		document.addEventListener("pointercancel", handlePointerCancel, {
			signal,
			capture: true,
			passive: false,
		});
		document.addEventListener("pointerleave", handlePointerLeave, {
			signal,
			capture: true,
			passive: false,
		});

		return () => abortController.abort();
	}, [websocket, getRelativePointerPosition]);

	return { participants, containerRef };
};
