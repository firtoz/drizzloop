import { PerfectCursor } from "perfect-cursors";
import React, { useState, useLayoutEffect } from "react";

export function usePerfectCursor(
	cb: (point: [number, number]) => void,
	point?: [number, number],
) {
	const [pc] = useState(
		() => new PerfectCursor(cb as (point: number[]) => void),
	);

	useLayoutEffect(() => {
		if (point) {
			pc.addPoint(point);
		}
	}, [pc, point]);

	useLayoutEffect(() => {
		return () => pc.dispose();
	}, [pc]);

	const onPointChange = React.useCallback(
		(point: [number, number]) => pc.addPoint(point),
		[pc],
	);

	return onPointChange;
}
