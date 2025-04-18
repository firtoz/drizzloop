export type Branded<T, K extends string> = T & { __brand: K };

export const brand = <TBrand extends Branded<T, string>, T = unknown>(
	value: T,
): TBrand => {
	return value as unknown as TBrand;
};
