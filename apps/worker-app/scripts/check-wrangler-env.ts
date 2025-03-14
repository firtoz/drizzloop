import process from "node:process";

interface CloudflareResponse {
	success: boolean;
	errors: Array<{
		code: number;
		message: string;
		error_chain?: Array<{
			code: number;
			message: string;
		}>;
	}>;
	messages: Array<{
		code: number;
		message: string;
		type: string | null;
	}>;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	result: any;
}

async function checkCloudflareToken(): Promise<void> {
	const token = process.env.CLOUDFLARE_API_TOKEN;
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

	if (!token) {
		console.error("\x1b[31mError: CLOUDFLARE_API_TOKEN is not set\x1b[0m");
		process.exit(1);
	}

	if (!accountId) {
		console.error("\x1b[31mError: CLOUDFLARE_ACCOUNT_ID is not set\x1b[0m");
		process.exit(1);
	}

	console.log("\n🔍 Checking Cloudflare token...");

	try {
		// First verify the token is valid
		const verifyURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`;
		console.log("\n1️⃣ Verifying token validity...");
		console.log("URL:", verifyURL);
		console.log("Headers:", {
			Authorization: `Bearer ${token.slice(0, 8)}...${token.slice(-4)}`,
			"Content-Type": "application/json",
		});

		const verifyResponse = await fetch(verifyURL, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});

		const verifyData = (await verifyResponse.json()) as CloudflareResponse;
		console.log("\nVerify Response:", JSON.stringify(verifyData, null, 2));

		if (!verifyData.success) {
			console.error("\x1b[31mError: Invalid CLOUDFLARE_API_TOKEN\x1b[0m");
			if (verifyData.errors.length > 0) {
				console.error("\nErrors:");
				for (const error of verifyData.errors) {
					console.error(`- ${error.message}`);
					if (error.error_chain) {
						for (const chainError of error.error_chain) {
							console.error(`  - ${chainError.message}`);
						}
					}
				}
			}
			console.error(
				`\x1b[33m\nPlease check your token at:\nhttps://dash.cloudflare.com/${accountId}/api-tokens\x1b[0m`,
			);
			process.exit(1);
		}

		console.log("\n✅ Token is valid");

		// Check Workers API access
		console.log("\n2️⃣ Checking Workers API access...");
		const workersURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;
		console.log("URL:", workersURL);

		const workersResponse = await fetch(workersURL, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});

		const workersData = (await workersResponse.json()) as CloudflareResponse;

		if (!workersData.success) {
			console.error("\x1b[31mError: Token lacks Workers API access\x1b[0m");
			console.error(
				"\x1b[33mPlease ensure your token has the following permissions:\x1b[0m",
			);
			console.error("- Workers Scripts Edit");
			console.error("- Account Settings Read");
			console.error("- Workers KV Storage Edit");
			console.error("- Workers Tail Read");
			console.error(
				`\x1b[33m\nYou can update your token at:\nhttps://dash.cloudflare.com/${accountId}/api-tokens\x1b[0m`,
			);
			process.exit(1);
		}

		// Check KV API access
		console.log("\n3️⃣ Checking KV API access...");
		const kvURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`;
		console.log("URL:", kvURL);

		const kvResponse = await fetch(kvURL, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});

		const kvData = (await kvResponse.json()) as CloudflareResponse;

		if (!kvData.success) {
			console.error("\x1b[31mError: Token lacks KV API access\x1b[0m", kvData);
			console.error(
				"\x1b[33mPlease ensure your token has the following permissions:\x1b[0m",
			);
			console.error("- Workers KV Storage Edit");
			console.error(
				`\x1b[33m\nYou can update your token at:\nhttps://dash.cloudflare.com/${accountId}/api-tokens\x1b[0m`,
			);
			process.exit(1);
		}

		console.log(
			"\n\x1b[32m✅ Cloudflare API token has the required permissions\x1b[0m",
		);
	} catch (error: unknown) {
		console.error(
			"\x1b[31mError verifying Cloudflare API token:",
			error instanceof Error ? error.message : String(error),
			"\x1b[0m",
		);
		process.exit(1);
	}
}

void checkCloudflareToken();
