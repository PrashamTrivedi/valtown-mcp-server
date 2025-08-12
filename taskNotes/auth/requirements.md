# Purpose

Enable authorization on valtown

## Process

Read this

https://workos.com/blog/mcp-authorization-in-5-easy-oauth-specs?aid=recHJRWRl90yeA9e9

And

https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization

And based on this, we need to enable auth on valtown.

While valtown doesn't have any oauth server, they create an api token and hand
out to users, and that token can be passed in headers for remote mcp server. We
need to use official oauth specs from above to have authorization on remote MCP
servers
