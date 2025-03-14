export type Env = {
	EXAMPLE_DO: DurableObjectNamespace<
		import("../../durable-objects/example-do/src/ExampleDO").ExampleDO
	>;
	ENV: "local" | "production";
};
