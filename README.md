# React Router Durable Objects Boilerplate

This project is a boilerplate for creating a React Router application with Cloudflare Durable Objects. It's set up as a monorepo using Bun and Turborepo for efficient management and building.

## Project Structure

The project is organized as follows:

- `apps/`:
  - `web-app`: Contains the React Router application
  - `worker-app`: Contains the Cloudflare Worker configuration
- `durable-objects/`:
  - `example-do`: Contains the Example Durable Object
- `packages/`:
  - `biome-config`: Biome (linter/formatter) configuration
  - `cloudflare-worker-config`: Cloudflare Worker type definitions
  - `hono-typed-fetcher`: Type-safe fetcher for Hono apps and Durable Objects
  - `integration-tests`: End-to-end tests for Workers and Durable Objects
  - `wrangler-config-helper`: Utilities for Wrangler configuration

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later recommended)
- [Bun](https://bun.sh/) (latest version)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (v3 or later)

This project is set up to use Bun and Turborepo. While it may be possible to use npm or Yarn, this is not officially supported.

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   bun install
   ```

## Available Scripts

In the project directory, you can run:

### `bun run dev`

Runs the app in development mode.
Open [http://localhost:5137](http://localhost:5137) to view it in your browser.

Note: The development server is configured with a WebSocket proxy for local development. If you need to add more WebSocket endpoints, you'll need to adjust the proxy configuration in `apps/web-app/vite.config.ts`. The default configuration is:

```ts
proxy: {
  "/websocket": {
    ws: true,
    changeOrigin: true,
    target: "ws://localhost:8787",
  },
},
```

### `bun run build`

Builds the app for production.

### `bun run start`

Runs the app in a mock production environment using the results from `bun run build`.

### `bun run lint`

Runs the linter (Biome) across the project.

### `bun run test`

Runs the tests using Vitest. This includes:
- Unit tests for individual packages
- Integration tests for Workers and Durable Objects using Miniflare environment

### `bun run deploy`

Deploys the app to Cloudflare in the production configuration.

## Features

- React Router application with Cloudflare Workers
- Durable Objects integration
- TypeScript support
- Tailwind CSS for styling
- Biome for linting and formatting
- Vitest for testing
  - Unit tests for packages
  - Integration tests with Miniflare environment
- Hono for API routing in Durable Objects
- Custom type-safe fetcher for Hono apps and Durable Objects

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [React Router Documentation](https://reactrouter.com/en/main)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects)
- [Turborepo](https://turbo.build/repo)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Hono](https://hono.dev/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
