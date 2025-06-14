# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About ValTown

ValTown is a serverless platform for running TypeScript/JavaScript code in the cloud. Key concepts for developers:

- **Vals**: Code snippets that can be HTTP endpoints, scheduled functions, or scripts
- **HTTP Vals**: Functions that handle HTTP requests (similar to serverless functions)
- **Interval Vals**: Functions that run on a schedule (like cron jobs)
- **Script Vals**: One-time or manually triggered functions
- **Email Vals**: Functions that handle incoming emails
- **API Integration**: Full REST API for programmatic access to create/update/delete vals
- **Remote Execution**: Code runs in ValTown's sandboxed environment with built-in npm package support

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides AI assistants with access to ValTown's platform. The codebase supports two deployment modes:

1. **Local Binary Mode** (`mod.ts`): Runs as a local MCP server using stdio transport
2. **Remote HTTP Mode** (`index.http.ts`): Deployed on ValTown itself as an HTTP endpoint, accessible via streamable HTTP transport

The server is hosted remotely on ValTown at: `https://prashamtrivedi-valtown-mcp-server.val.run/mcp`

Key files:
- `mod.ts`: Local stdio MCP server entry point
- `index.http.ts`: Remote HTTP MCP server entry point (deployed on ValTown)
- `registerTools.ts`: Tool registration with CLI exclusion support for remote deployment
- `config.ts`: Configuration loading with remote/local mode support

## Commands

- Run server locally: `deno task start`
- Development mode: `deno task dev`
- Build binaries: `deno task build`
- Platform-specific builds: `deno task build:linux`, `deno task build:windows`, `deno task build:macos`

## Style Guidelines

- Use TypeScript strict mode with explicit typing for function parameters/returns
- 2-space indentation, semicolons at line ends
- Use camelCase for variables/functions, PascalCase for types/interfaces, UPPER_SNAKE_CASE for constants
- Tool names use kebab-case (e.g., `get-val`)
- Document all public functions with JSDoc
- Wrap async operations in try/catch blocks and use getErrorMessage utility
- Return consistent error responses with isError flag

## Conventions

- Follow [Conventional Commits](https://www.conventionalcommits.org/) format
- Feature branches: `feature/description`, bug fixes: `fix/description`
- Validate all user inputs and follow least privilege principle
- Never commit API tokens or secrets
- Each tool should have a clear purpose with descriptive parameters