import { honoDoFetcherWithName } from "@greybox/hono-typed-fetcher/honoDoFetcher";
import React from "react";
import { Await, useLoaderData } from "react-router";
import { Welcome } from "~/welcome/welcome";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

export const loader = async ({ context }: Route.LoaderArgs) => {
	const ExampleDO = context.cloudflare.env.EXAMPLE_DO;
	if (!ExampleDO) {
		throw new Error("EXAMPLE_DO is not defined?");
	}

	const fetcher = honoDoFetcherWithName(ExampleDO, "default");

	return {
		env: context.cloudflare.env.ENV,
		getMessage: fetcher
			.get({
				url: "/",
			})
			.then((r) => r.text()),
		postData: fetcher
			.post({
				url: "/test",
				body: {
					name: "John Doe",
				},
			})
			.then((r) => r.json()),
	};
};

export default function Index() {
	const { getMessage, postData, env } = useLoaderData<typeof loader>();

	return (
		<Welcome
			env={env}
			message={
				<React.Fragment>
					<React.Suspense fallback={<div>GET: ...</div>}>
						<Await resolve={getMessage}>
							{(message) => <div>{message}</div>}
						</Await>
					</React.Suspense>
					<React.Suspense fallback={<div>POST: ...</div>}>
						<Await resolve={postData}>
							{(data) => <div>{data.message}</div>}
						</Await>
					</React.Suspense>
				</React.Fragment>
			}
		/>
	);
}
