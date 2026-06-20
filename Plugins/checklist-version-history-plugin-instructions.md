# Checklist Version History Plugin Instructions

## Goal

Add server-side history logging for checklist version workflow events. The React editor should eventually render `int_checklistversionhistory` rows as a timeline instead of treating the latest submit/review fields on `int_checklistversion` as the full history.

Keep the existing current-state fields on `int_checklistversion`; they are still useful for filtering, views, and quick display:

- `int_submissioncomments`
- `int_submittedby`
- `int_submittedon`
- `int_reviewdecision`
- `int_reviewreason`
- `int_reviewedby`
- `int_reviewedon`
- `int_publishedby`
- `int_publishedon`

The history table is append-only workflow evidence. Do not update old history rows as part of normal workflow actions.

## History Table

Table logical name:

`int_checklistversionhistory`

Expected columns:

| Column | Purpose |
| --- | --- |
| `int_checklistversion` | Required lookup to `int_checklistversion`. |
| `int_eventtype` | Choice describing the event. |
| `int_eventon` | Server operation time. |
| `int_eventby` | Lookup to the initiating `systemuser`. |
| `int_title` | Short timeline title. |
| `int_description` | Short explanatory text. |
| `int_comments` | Submission or reviewer comments, where relevant. |
| `int_reviewdecision` | Review decision choice, where relevant. |
| `int_fromstatus` | Previous checklist version `statuscode`, where relevant. |
| `int_tostatus` | New checklist version `statuscode`, where relevant. |
| `int_detailsjson` | Optional JSON for future structured details. |

Known `int_eventtype` values:

| Value | Label | When to write |
| ---: | --- | --- |
| `100000000` | Draft Created | Future create-version flow. Not required for the current Custom APIs. |
| `100000010` | Submitted | Draft submitted for review. |
| `100000020` | Published | Version published directly or after approval. |
| `100000030` | Approved | Reviewer approved a pending-review version. |
| `100000040` | Rejected | Reviewer rejected a pending-review version. |
| `100000050` | Requires Amendments | Reviewer returned a pending-review version to draft. |
| `100000060` | Superseded | Existing published version superseded during publish. |
| `100000070` | Archived | Future archive flow. |

Known `int_reviewdecision` values:

| Value | Label |
| ---: | --- |
| `100000000` | Approved |
| `200000000` | Rejected |
| `300000000` | Requires Amendments |

## Code Shape

Add constants under `ChecklistVersionConstants`:

- `Table.ChecklistVersionHistory = "int_checklistversionhistory"`
- New nested class `ChecklistVersionHistory` with logical names for all history columns.
- New nested class `HistoryEventType` with the values above.

Add a small internal helper service:

`ChecklistVersionHistoryWriter`

Suggested location:

`Plugins/ChecklistVersion/ChecklistVersionHistoryWriter.cs`

Suggested public method shape:

```csharp
internal sealed class ChecklistVersionHistoryWriter
{
    public ChecklistVersionHistoryWriter(IOrganizationService service)
    {
    }

    public void Create(
        Guid checklistVersionId,
        int eventType,
        Guid eventByUserId,
        DateTime eventOn,
        string title,
        string description = null,
        string comments = null,
        int? reviewDecision = null,
        int? fromStatus = null,
        int? toStatus = null,
        string detailsJson = null)
    {
    }
}
```

Implementation rules:

- Use `context.InitiatingUserId` as `int_eventby`.
- Use `context.OperationCreatedOn` as `int_eventon`.
- Use `EntityReference("systemuser", eventByUserId)` for `int_eventby`.
- Use `EntityReference(ChecklistVersionConstants.Table.ChecklistVersion, checklistVersionId)` for `int_checklistversion`.
- Set `int_name` to a concise value, preferably the same as `int_title`.
- Only set optional fields when values are present.
- Never trust client-provided user ids or timestamps for history actor/time.

## Hook Points

### `SubmitOrPublishDraftChecklistVersionPlugin`

Current file:

`Plugins/ChecklistVersion/SubmitOrPublishDraftChecklistVersionPlugin.cs`

#### Submit for review path

Method:

`SubmitForReview`

After the checklist version and parent checklist updates succeed, create one history row:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Submitted` / `100000010` |
| `int_eventby` | `context.InitiatingUserId` |
| `int_eventon` | `context.OperationCreatedOn` |
| `int_title` | `Submitted for review` |
| `int_description` | `Checklist version submitted for review.` |
| `int_comments` | `SubmissionComments`, if non-empty |
| `int_fromstatus` | Draft / `100000000` |
| `int_tostatus` | Pending Review / `100000010` |

Use the existing `submissionComments` variable. Do not read actor/time from request parameters.

#### Direct publish path

When review is not required, `SubmitOrPublishDraftChecklistVersionPlugin` calls `PublishChecklistVersion.Execute`.

Update `PublishChecklistVersion.Execute` to accept optional publish comments, then pass the Custom API `SubmissionComments` value through from the submit/publish plugin. The publish service should write the `Published` history row; do not duplicate it in the submit plugin.

### `ApproveChecklistVersionForPublishingPlugin`

Current file:

`Plugins/ChecklistVersion/ApproveChecklistVersionForPublishingPlugin.cs`

#### Approved path

When `ReviewDecision = Approved`:

1. Keep the existing `StoreReviewMetadata` behavior.
2. Create one `Approved` history row after review metadata is stored and before or after publish service execution.
3. Let `PublishChecklistVersion.Execute` create the `Published` history row.

Approved history row:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Approved` / `100000030` |
| `int_eventby` | `context.InitiatingUserId` |
| `int_eventon` | `context.OperationCreatedOn` |
| `int_title` | `Approved` |
| `int_description` | `Checklist version approved for publishing.` |
| `int_comments` | `Reason`, if non-empty |
| `int_reviewdecision` | Approved / `100000000` |
| `int_fromstatus` | Pending Review / `100000010` |
| `int_tostatus` | Pending Review / `100000010` |

The separate `Published` row captures the actual status change to Published.

#### Requires amendments path

Method:

`MoveToRequiresAmendments` / `ExecuteReviewOutcomeTransaction`

After the version/checklist updates succeed, create one history row:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Requires Amendments` / `100000050` |
| `int_eventby` | `context.InitiatingUserId` |
| `int_eventon` | `context.OperationCreatedOn` |
| `int_title` | `Requires amendments` |
| `int_description` | `Checklist version returned to draft for amendments.` |
| `int_comments` | Required `Reason` |
| `int_reviewdecision` | Requires Amendments / `300000000` |
| `int_fromstatus` | Pending Review / `100000010` |
| `int_tostatus` | Draft / `100000000` |

#### Reject path

Method:

`Reject` / `ExecuteReviewOutcomeTransaction`

After the version/checklist updates succeed, create one history row:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Rejected` / `100000040` |
| `int_eventby` | `context.InitiatingUserId` |
| `int_eventon` | `context.OperationCreatedOn` |
| `int_title` | `Rejected` |
| `int_description` | `Checklist version rejected.` |
| `int_comments` | Required `Reason` |
| `int_reviewdecision` | Rejected / `200000000` |
| `int_fromstatus` | Pending Review / `100000010` |
| `int_tostatus` | Rejected / `100000030` |

### `PublishChecklistVersion`

Current file:

`Plugins/ChecklistVersion/PublishChecklistVersion.cs`

This class should be the only place that logs publish and supersede events.

Update `Execute` to accept an optional comments argument:

```csharp
public ChecklistVersionApiResponse Execute(
    EntityReference checklistVersionReference,
    bool approvalPathValidated,
    Guid publishingUserId,
    DateTime operationTime,
    string comments = null)
```

After the current version is updated to Published, create one history row:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Published` / `100000020` |
| `int_eventby` | `publishingUserId` |
| `int_eventon` | `operationTime` |
| `int_title` | `Published` |
| `int_description` | `Checklist version published.` |
| `int_comments` | Optional comments, if provided |
| `int_fromstatus` | The status retrieved before publish (`Draft` or `Pending Review`) |
| `int_tostatus` | Published / `100000020` |

Inside the loop that supersedes other published versions, create one history row per superseded version after each version update:

| History field | Value |
| --- | --- |
| `int_eventtype` | `Superseded` / `100000060` |
| `int_eventby` | `publishingUserId` |
| `int_eventon` | `operationTime` |
| `int_title` | `Superseded` |
| `int_description` | `Checklist version superseded by a newer published version.` |
| `int_fromstatus` | Published / `100000020` |
| `int_tostatus` | Superseded / `100000050` |
| `int_detailsjson` | Optional JSON containing the new published checklist version id. |

Example `detailsJson`:

```json
{"supersededByChecklistVersionId":"<guid>"}
```

## Transaction Behavior

These history rows should be created with the same `IOrganizationService` used by the workflow update. For synchronous Custom API plugins, this keeps the history creation in the same execution path as the state changes. If a history row create fails, the workflow action should fail rather than silently losing audit history.

Do not wrap this in `ExecuteMultiple` or `ExecuteTransaction` unless there is a clear reason. The plugin operations are already sequential and small.

## Editor Follow-Up

After plugin history logging is in place, update the React checklist editor:

1. Stop rendering the Approval History tab from current fields only.
2. Retrieve `int_checklistversionhistory` rows for the current version.
3. Order by `int_eventon desc` or `int_eventon asc`, depending on UX preference.
4. Render as a vertical timeline.
5. Keep current fields as a fallback while environments are being migrated.

Suggested query shape:

```http
GET /api/data/v9.2/int_checklistversionhistories?$select=int_name,int_eventtype,int_eventon,_int_eventby_value,int_title,int_description,int_comments,int_reviewdecision,int_fromstatus,int_tostatus,int_detailsjson&$filter=_int_checklistversion_value eq <version-id>&$orderby=int_eventon desc,createdon desc
```

Use formatted values for choice and lookup labels where available.

## Do Not Do

- Do not store the authoritative history as a JSON array on `int_checklistversion`.
- Do not use client-provided actor or timestamp fields for audit history.
- Do not create duplicate `Published` history rows in both the approval plugin and `PublishChecklistVersion`.
- Do not log superseded events on the parent checklist; superseded is version-specific.
