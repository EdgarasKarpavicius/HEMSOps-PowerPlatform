# Project Notes For Future Agents

## Dataverse MCP

This project uses the Dataverse MCP server named `HEMS_Ops_v2_Dev`.

The server is configured in `/Users/edgaraskarpavicius/.codex/config.toml` as:

```toml
[mcp_servers.HEMS_Ops_v2_Dev]
command = "npx"
args = ["-y", "@microsoft/dataverse", "mcp", "https://hemsops-v2-dev.crm11.dynamics.com/"]
```

If Dataverse tools such as `list_tables`, `describe_table`, `read_query`, or record CRUD tools are not visible in the active session, do not assume the MCP is absent. First check whether the session needs to be restarted or resumed so Codex reloads the configured MCP servers.

Because the MCP command uses `npx -y @microsoft/dataverse`, first-time startup may require network access if the package is not already cached.
