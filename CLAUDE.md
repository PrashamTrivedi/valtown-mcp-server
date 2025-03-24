# ValTown MCP Server Guidelines

## Commands
- Run server: `deno task start`
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