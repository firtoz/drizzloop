import { PerfectCursor } from "perfect-cursors";
import React, { useState, useLayoutEffect } from "react";

export function usePerfectCursor(
	cb: (point: number[]) => void,
	point?: number[],
) {
	const [pc] = useState(() => new PerfectCursor(cb));

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useLayoutEffect(() => {
		if (point) pc.addPoint(point);
		return () => pc.dispose();
	}, [pc]);

	const onPointChange = React.useCallback(
		(point: number[]) => pc.addPoint(point),
		[pc],
	);

	return onPointChange;
}
