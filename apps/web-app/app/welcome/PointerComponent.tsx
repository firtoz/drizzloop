import type { Pointer } from "example-do/types";
import { useCallback, useLayoutEffect, useRef } from "react";
import { usePerfectCursor } from "./hooks/usePerfectCursor";

export const PointerComponent = ({
	pointer,
	color,
	containerRef,
}: {
	pointer: Pointer;
	color: string;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
	const rPointer = useRef<SVGSVGElement>(null);

	const animatePointer = useCallback(
		(point: number[]) => {
			const current = rPointer.current;
			const container = containerRef.current;
			if (!current || !container) return;

			const rect = container.getBoundingClientRect();
			current.style.setProperty(
				"transform",
				`translate(${point[0] + rect.left}px, ${point[1] + rect.top}px)`,
			);
		},
		[containerRef],
	);

	const onPointMove = usePerfectCursor(animatePointer);

	useLayoutEffect(() => {
		return onPointMove([pointer.x, pointer.y]);
	}, [onPointMove, pointer.x, pointer.y]);

	return (
		<svg
			ref={rPointer}
			style={{
				position: "fixed",
				top: -9,
				left: -11,
				width: 35,
				height: 35,
				opacity: pointer.isActive ? 1 : 0.5,
			}}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 35 35"
			fill="none"
			fillRule="evenodd"
		>
			<title>Pointer {pointer.pointerId}</title>
			<g fill="rgba(0,0,0,.2)" transform="translate(1,1)">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill="white">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill={color}>
				<path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
				<path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
			</g>
		</svg>
	);
};
