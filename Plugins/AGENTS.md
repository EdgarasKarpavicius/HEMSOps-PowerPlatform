# Project Notes For Future Agents

## Dataverse Environment

Target development environment:

`https://hemsops-v2-dev.crm11.dynamics.com/`

Before making Dataverse changes, run `pac org who` and confirm the active environment matches this URL.

## Plug-in Assembly

Current assembly name:

`Intelogy.HEMSOps.Plugins`

Registered development `pluginassemblyid`:

`685eac90-1852-4c9d-9726-50f71443c287`

Current build output:

`bin/Debug/net462/Intelogy.HEMSOps.Plugins.dll`

To push an updated assembly after local code changes:

```bash
pac plugin push \
  --pluginId 685eac90-1852-4c9d-9726-50f71443c287 \
  --pluginFile "bin/Debug/net462/Intelogy.HEMSOps.Plugins.dll" \
  --type Assembly
```

Build before pushing:

```bash
dotnet build Plugins.csproj
```

## Registered Plug-in Types

Register / bind these types:

- `Intelogy.HEMSOps.Plugins.ChecklistVersion.SubmitOrPublishDraftChecklistVersionPlugin`
- `Intelogy.HEMSOps.Plugins.ChecklistVersion.ApproveChecklistVersionForPublishingPlugin`
- `Intelogy.HEMSOps.Plugins.ChecklistVersion.ProtectPublishedChecklistVersionFieldsPlugin`

Do not register this internal service type:

- `Intelogy.HEMSOps.Plugins.ChecklistVersion.PublishChecklistVersion`

## Custom API Contract

`int_SubmitOrPublishDraftChecklistVersion`

- Bound table: `int_checklistversion`
- Request parameters:
  - `SubmissionComments` string, optional
- Response properties:
  - `Outcome` string
  - `Message` string

`int_ApproveChecklistVersionForPublishing`

- Bound table: `int_checklistversion`
- Request parameters:
  - `ReviewDecision` picklist/integer, required
  - `Reason` string, optional
- `ReviewDecision` values:
  - Approved: `100000000`
  - Rejected: `200000000`
  - Requires Amendments: `300000000`
- Response properties:
  - `Outcome` string
  - `Message` string

## Checklist Version History

For the planned workflow timeline / audit log, follow:

`checklist-version-history-plugin-instructions.md`

The intended table is `int_checklistversionhistory`. Workflow Custom API plugins should append history rows for submit, review, publish, reject, requires-amendments, supersede, and future archive events. Current fields on `int_checklistversion` should remain as latest-state metadata, not the authoritative history.

## Protection Step

`ProtectPublishedChecklistVersionFieldsPlugin`

- Message: `Update`
- Primary entity: `int_checklistversion`
- Stage: PreOperation
- Mode: Synchronous
- Filtering attributes:
  - `int_definitionjson`
  - `int_definitionhash`
  - `statecode`
  - `statuscode`
- Pre image:
  - Name / alias: `PreImage`
  - Attributes: `statecode`
