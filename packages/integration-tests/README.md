# Integration Tests

This package contains integration tests for the Remix Cloudflare Workers application using Vitest and the Cloudflare Workers test pool.

## Setup

The tests are configured to run against local instances of both the main worker application and Durable Objects. The setup includes:

- Vitest with Cloudflare Workers test pool
- Local Miniflare environment for testing
- Automatic build process for Durable Objects before tests

## Running Tests

```bash
# Run tests once
bun run test

# Run tests in watch mode
bun run test:watch
```

## Test Structure

The tests are located in the `tests/` directory and cover:
- Basic request handling
- HTTP method handling
- Worker functionality
- Durable Object interactions

## Configuration

- `vitest.config.mts`: Configures the test environment, including worker setup and Miniflare configuration
- `global-setup.ts`: Handles pre-test setup, including building Durable Objects
- `tsconfig.json`: TypeScript configuration for the test suite

## Dependencies

Key dependencies include:
- `@cloudflare/vitest-pool-workers`: For running tests in a Cloudflare Workers environment
- `vitest`: Test runner
- `wrangler`: Cloudflare Workers CLI tool
- Local workspace packages: `example-do` and `worker-app`
