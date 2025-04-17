export type Branded<T, K extends string> = T & { __brand: K };
