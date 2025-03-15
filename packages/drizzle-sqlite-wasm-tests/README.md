# Drizzle SQLite WASM Tests

This package contains tests for the Drizzle ORM integration with SQLite WASM.

## Features

- Tests for basic CRUD operations
- Tests for complex queries
- Tests for migrations
- Tests for all data types

## Running Tests

```bash
# Run tests once
bun run --cwd ./packages/drizzle-sqlite-wasm-tests test

# Run tests in watch mode
bun run --cwd ./packages/drizzle-sqlite-wasm-tests test:watch
```

## Test Structure

- `drizzle-sqlite-wasm.test.ts`: Basic tests for CRUD operations and queries
- `comprehensive.test.ts`: Comprehensive tests covering all query types and data types
- `migrations.test.ts`: Tests for the migration system

## Dependencies

This package depends on:
- `@sqlite.org/sqlite-wasm`: SQLite compiled to WebAssembly
- `drizzle-orm`: Drizzle ORM
- `@vitest/web-worker`: Vitest environment for web workers
- `web-app`: Internal package containing the SQLite WASM adapter 