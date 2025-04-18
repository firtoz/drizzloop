const brandSymbol = Symbol("brand");

export type Branded<T, K extends string> = T & { [brandSymbol]: K };

export const brand = <TBrand extends Branded<T, string>, T = unknown>(
	value: T,
): TBrand => {
	return value as unknown as TBrand;
};
