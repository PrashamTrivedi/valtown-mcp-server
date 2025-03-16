# ValTown MCP Server Code Conventions

This document outlines the coding standards, architecture, and conventions used
in the ValTown MCP Server project. It serves as both an onboarding guide for new
developers and a reference for AI coding assistants.

## Project Structure

```
valTownMCPServer/
├── lib/            # Core utilities and types
├── tools/          # MCP tools implementations
├── mod.ts          # Main entry point
├── server.ts       # Server implementation
└── docs/           # Documentation
```

## TypeScript Conventions

### General Style

- Use TypeScript strict mode
- Prefer explicit typing over inferred types for function parameters and returns
- Use interfaces for object shapes and types for unions/aliases
- Indent with 2 spaces
- Use semicolons at the end of statements

### Naming Conventions

- `camelCase` for variables, functions, and method names
- `PascalCase` for interface, type, class, and enum names
- `UPPER_SNAKE_CASE` for constants
- Descriptive names that indicate purpose (avoid abbreviations)

### Example

```typescript
// Good
interface UserResponse {
  id: string;
  username: string;
}

async function fetchUserData(userId: string): Promise<UserResponse> {
  // Implementation
}

// Avoid
interface resp {
  id: string;
  uname: string;
}

async function fetch(id) {
  // Implementation
}
```

## MCP Tool Conventions

### Tool Implementation

- Each tool should have a clear, specific purpose
- Tool names should be kebab-case (e.g., `get-val`, `run-function`)
- Tool descriptions should be concise but comprehensive
- Parameters should have descriptive names and appropriate validation
- Tools should handle errors gracefully
- Return consistent response formats

### Example Tool Registration

```typescript
server.tool(
  "run-function",
  "Execute a ValTown function by its ID or URL",
  {
    functionIdentifier: z.string().describe("Function ID or URL to execute"),
    args: z.array(z.any()).optional().describe(
      "Arguments to pass to the function",
    ),
  },
  async ({ functionIdentifier, args = [] }) => {
    try {
      // Implementation
      return {
        content: [{ type: "text", text: "Result data" }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${getErrorMessage(error)}` }],
        isError: true,
      };
    }
  },
);
```

## Error Handling

- Use try/catch blocks for all async operations
- Use the `getErrorMessage` utility for consistent error message extraction
- Return appropriate error responses with isError flag set to true
- Log errors with relevant context

## Testing Conventions

- Unit tests for individual functions
- Integration tests for API interactions
- Test files should be named `*.test.ts`
- Use descriptive test names that explain the expected behavior

## Version Control

- Commit messages should follow
  [Conventional Commits](https://www.conventionalcommits.org/) format
- Feature branches should follow the pattern `feature/description-of-feature`
- Bug fix branches should follow the pattern `fix/description-of-bug`

## Documentation

- Document all public functions and interfaces with JSDoc comments
- Keep README.md up to date with installation and usage instructions
- Add examples for common use cases

## Environment Variables

- Document all required environment variables
- Use sensible defaults when possible
- Validate environment variables at startup

## Performance Considerations

- Minimize external API calls
- Use appropriate caching strategies
- Handle rate limiting gracefully

## Security Practices

- Never commit API tokens or secrets
- Validate and sanitize all user inputs
- Follow the principle of least privilege

```
By following these conventions, we maintain a consistent, high-quality codebase that is easier to maintain and extend.
```
