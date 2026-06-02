# ChartRunner SDK Public Status

The public repository currently ships the playable browser prototype and the SDK boundary contract inside that prototype. A standalone `@chartrunner/core` package is not published yet.

## Public

- `ChartRunner_Prototype.html` demonstrates the SDK order boundary in the playable game.
- Public docs describe the stable rule: `ChartRunnerSDK` is the only order-like action path.
- Devnet wallet and Anchor program source remain public.

## Gated Until Package Readiness

- Standalone SDK source package.
- Generated browser SDK artifacts under `/sdk/`.
- Broker adapters, hosted transports, MCP servers, agent wrappers, premium bot logic, and private data pipelines.

## Publish Gate

Before the SDK becomes public as a package, it needs a stable source tree, green package tests, a public README, a versioned API reference, and an explicit separation between paper/sandbox adapters and live execution.
