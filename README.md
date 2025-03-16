# ValTown MCP Server

A Model Context Protocol (MCP) server for [ValTown](https://www.val.town/) that
allows AI assistants to execute code in the ValTown environment.

## Features

- Execute ValTown functions from AI assistants
- Compatible with all MCP clients (Claude Desktop, Claude Code, etc.)
- Cross-platform support (Windows, macOS, Linux)

## Installation

### Option 1: Use pre-built binaries

Download the appropriate binary for your platform from the
[latest release](https://github.com/YOUR_USERNAME/valtown-mcp-server/releases/latest):

- Linux: `valtown-mcp-linux`
- Windows: `valtown-mcp-windows.exe`
- macOS: `valtown-mcp-macos`

### Option 2: Build from source

1. Install [Deno](https://deno.land/#installation)
2. Clone this repository
3. Build the binaries:
   ```
   deno task build          # Builds for all platforms
   deno task build:linux    # Builds only for Linux
   deno task build:windows  # Builds only for Windows
   deno task build:macos    # Builds only for macOS
   ```

### Option 3: Run directly with Deno

```
deno task start  # Run the server
deno task dev    # Run the server with watch mode for development
```

## Configuration

The server requires a ValTown API token to operate. Set the following
environment variable:

- `VAL_TOWN_API_TOKEN`: Your ValTown API token (starts with `vtwn_`)

You can obtain a ValTown API token from your
[ValTown account settings](https://www.val.town/settings).

## Usage with MCP Clients

### Claude Desktop

#### Windows Configuration

Add the following to your Claude Desktop configuration:

```json
"valtown": {
  "command": "C:\\path\\to\\valtown-mcp-windows.exe",
  "env": {
    "VAL_TOWN_API_TOKEN": "vtwn_KEY"
  }
}
```

#### macOS Configuration

Add the following to your Claude Desktop configuration:

```json
"valtown": {
  "command": "/path/to/valtown-mcp-macos",
  "env": {
    "VAL_TOWN_API_TOKEN": "vtwn_KEY"
  }
}
```

#### Linux Configuration

Add the following to your Claude Desktop configuration:

```json
"valtown": {
  "command": "/path/to/valtown-mcp-linux",
  "env": {
    "VAL_TOWN_API_TOKEN": "vtwn_KEY"
  }
}
```

#### Running with Deno (all platforms)

If you have Deno installed, you can run the server directly:

```json
"valtown": {
  "command": "deno",
  "args": ["run", "--allow-net", "--allow-env", "--allow-read", "/path/to/mod.ts"],
  "env": {
    "VAL_TOWN_API_TOKEN": "vtwn_KEY"
  }
}
```

### Claude Code

Add the ValTown MCP server to Claude Code using the CLI:

```bash
claude mcp add valtown /path/to/valtown-mcp-linux -e VAL_TOWN_API_TOKEN=vtwn_KEY
```

On Windows, use:

```bash
claude mcp add valtown C:\path\to\valtown-mcp-windows.exe -e VAL_TOWN_API_TOKEN=vtwn_KEY
```

On macOS, use:

```bash
claude mcp add valtown /path/to/valtown-mcp-macos -e VAL_TOWN_API_TOKEN=vtwn_KEY
```

### Other MCP Compatible Clients

For other MCP compatible clients, configure them to point to the ValTown MCP
server binary and ensure the `VAL_TOWN_API_TOKEN` environment variable is set.

## Troubleshooting

- Ensure your ValTown API token is valid
- Check that the server has network access
- Verify the correct permissions are set on the binary (Linux/macOS may require
  `chmod +x`)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
