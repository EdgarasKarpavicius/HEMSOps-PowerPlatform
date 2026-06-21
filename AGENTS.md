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

## Checklist Version Editor Generative Page

This repo contains the source for an existing Power Apps model-driven app generative page.

- Model-driven app unique name: `int_OpsDataManager`
- UX Agent project name: `Checklist Version Editor`
- Generative page id: `1f0aee6c-966e-4ec1-a908-d257de6d65a5`
- Local source file: `Generative Pages/checklisteditor.tsx`
- Launcher web resource: `WebResources/Code/int_js_checklistVersion_openChecklistVersionEditor.js`
- Target dev environment noted for this repo: `https://hemsops-v2-dev.crm11.dynamics.com/`

When the user asks for changes to the Checklist Version Editor generative page, treat `Generative Pages/checklisteditor.tsx` as the source of truth. Do not edit the deployed page directly in the maker portal unless the user explicitly asks for portal-only changes; keep the repo source updated first.

### Skills And References

- Start with `dv-overview` for Power Platform / Dataverse routing and environment-safety rules.
- Use `dv-query` when inspecting existing Dataverse records, option values, app settings, or related checklist data.
- Use `dv-metadata` only when the requested page change requires schema/form/view changes.
- Use `dv-solution` when exporting/importing or packaging solution components.
- If Microsoft `power-platform-skills` is installed in the active agent environment, use its `model-apps` / `/genpage` workflow for generative pages. If it is not installed, do not block; use the same workflow manually with PAC CLI commands and this repo's local source.

Useful upstream reference:

```text
https://github.com/microsoft/power-platform-skills/tree/main/plugins/model-apps
```

### Environment Safety Before Publish

For this repo, the Dataverse target environment is already confirmed as:

```text
https://hemsops-v2-dev.crm11.dynamics.com/
```

This repo-specific instruction overrides the generic `dv-overview` multi-environment confirmation prompt. Do not ask the user to confirm this URL again for normal Dataverse operations or generative-page publishes in this workspace. Treat the URL above as the intended environment unless the user explicitly provides a different URL in the current request.

Before any operation that touches Dataverse or uploads/publishes the page:

1. Use `https://hemsops-v2-dev.crm11.dynamics.com/` as the target environment without asking for another confirmation.
2. Run `pac org who` and verify the active PAC profile matches `https://hemsops-v2-dev.crm11.dynamics.com/`.
3. Do not publish if the active PAC org is not `https://hemsops-v2-dev.crm11.dynamics.com/` or whatever different URL the user explicitly provided in the current request.

### Edit And Review Workflow

For source changes:

1. Inspect `Generative Pages/checklisteditor.tsx` and preserve the single-file React/TypeScript generative page shape.
2. Keep generated page code compatible with Power Apps generative pages: React + TypeScript + Fluent UI, default export `GeneratedComponent`, and Dataverse access through the page's existing `Xrm.WebApi` patterns.
3. Preserve the page id in the launcher web resource unless the user is intentionally replacing the deployed page.
4. Be careful with workflow rules around `int_checklistversion` statuses. Draft and Requires Amendments are editable; Pending Review and Published/Superseded/Rejected should not allow definition edits unless the user confirms a workflow change.
5. If changing submit/publish/review behavior, compare with `Plugins/checklist-editor-custom-api-integration-notes.md` and the plugin implementations under `Plugins/ChecklistVersion/`.

### Publish / Upload Workflow

After editing and reviewing the local source, publish the generative page back to the existing page/app with PAC CLI. The source file should keep the `.tsx` extension because `pac model genpage upload` transpiles TypeScript by resolving standard TypeScript extensions.

The exact PAC flags can vary by installed PAC CLI version, so first inspect:

```bash
pac model genpage upload --help
```

Target the existing model-driven app and page:

```text
app unique name: int_OpsDataManager
page id: 1f0aee6c-966e-4ec1-a908-d257de6d65a5
source: Generative Pages/checklisteditor.tsx
```

Use this proven publish flow for the dev environment:

1. Use `https://hemsops-v2-dev.crm11.dynamics.com/` as the already-confirmed target environment.
2. Run `pac org who` and verify the active org URL is `https://hemsops-v2-dev.crm11.dynamics.com/`.
3. Run `pac model list` if the app id is needed. For `int_OpsDataManager`, the known app id is `85c8332d-60e5-4e3a-bfcf-0ebdfbceb0d5`.
4. Upload and publish the existing page:

```bash
pac model genpage upload \
  --environment https://hemsops-v2-dev.crm11.dynamics.com/ \
  --app-id 85c8332d-60e5-4e3a-bfcf-0ebdfbceb0d5 \
  --page-id 1f0aee6c-966e-4ec1-a908-d257de6d65a5 \
  --code-file "Generative Pages/checklisteditor.tsx" \
  --name "Checklist Version Editor" \
  --prompt "<short description of the requested change>" \
  --agent-message "<short summary of what changed>" \
  --data-sources int_checklist,int_checklistversion,int_checklistversionhistory
```

Successful publish output should include:

```text
Successfully pushed page. Page ID: 1f0aee6c-966e-4ec1-a908-d257de6d65a5
Project published successfully.
```

After upload, verify by opening a checklist version through `checklistVersion.openChecklistVersionEditor` from the model-driven app or by using the existing launcher web resource. If the Browser plugin is available and a local or deployed URL is known, use it to smoke-test the page. For workflow-sensitive changes, verify the relevant statuses explicitly; for example, Draft and Requires Amendments versions should allow editing, while Pending Review should show review actions without definition editing controls.
