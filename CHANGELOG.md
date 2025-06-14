# Changelog

## [Unreleased]

### Added

- Added remote HTTP transport for ValTown deployment
- Added GET endpoint for MCP server info
- Added online connection method to README with hosted ValTown server
  configuration
- Added changelog documentation and guidelines
- Added prompt files for Townie and OpenTownie templates with guidelines
- Included prompt files in build tasks for all platforms
- Added comprehensive CLAUDE.md with ValTown platform context and architecture overview

### Changed

- Upgraded to V2 APIs with enhanced prompt system and branch management tools
- Migrated from deno.json import map to direct npm imports
- Updated README with improved documentation for first-time visitors and online
  connection method
- Updated CLI function calls to match interface signatures
- Updated Config interface and fixed Deno.run API usage

### Fixed

- Fixed placeholder repository URLs in README.md and index.http.ts documentation links
- Fixed security vulnerability: removed API token logging in HTTP requests
- Fixed missing JSON parse error handling in HTTP MCP endpoint
- Fixed information leakage in HTTP error responses

## [v0.2]

### Added

- Added validation for project name and description length

## [v0.1]

### Changed

- Added type annotations to async parameters in tools
- Updated Deno setup to version 2.x in workflows

### Added

- Added nightly and stable release workflows
- Improved readability of LICENSE and README files

### Fixed

- Formatted documentation files for better readability
