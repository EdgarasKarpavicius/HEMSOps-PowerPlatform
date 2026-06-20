# Checklist Editor Custom API Integration Notes

These notes are for updating the React checklist editor so its draft submit/publish and review buttons call the Dataverse Custom APIs backed by the `Intelogy.HEMSOps.Plugins` assembly.

## Overview

Checklist version workflow is controlled by the environment variable:

`int_RequireChecklistVersionReview`

Existing editor behavior should remain:

- When `int_RequireChecklistVersionReview = true`, the draft action button should read `Submit for Approval`.
- When `int_RequireChecklistVersionReview = false`, the draft action button should read `Publish`.
- If the setting cannot be read, default to review required.

The plugin layer reads the same setting server-side. The UI should still use the setting for labels and available actions, but the server is authoritative.

## Custom APIs

Both APIs are entity-bound to `int_checklistversion`.

Do not send a `Target` parameter in the body. For entity-bound APIs, the target is the record in the URL.

### Submit or Publish Draft

Custom API:

`int_SubmitOrPublishDraftChecklistVersion`

Bound table:

`int_checklistversion`

HTTP call shape:

```http
POST /api/data/v9.2/int_checklistversions(<checklist-version-id>)/Microsoft.Dynamics.CRM.int_SubmitOrPublishDraftChecklistVersion
```

Request body:

```json
{
  "SubmissionComments": "Optional submitter comments"
}
```

`SubmissionComments` is optional. If the user leaves comments blank, omit it or send an empty string.

Do not send submitted-by or submitted-on values. The plugin uses:

- `context.InitiatingUserId` for `int_submittedby`
- `context.OperationCreatedOn` for `int_submittedon`

Possible response outcomes:

| Outcome | Meaning |
|---|---|
| `submittedForReview` | Review is required; draft version and parent checklist were moved to Pending Review. |
| `published` | Review is not required; draft version was published directly. |

Response body fields:

| Field | Type | Purpose |
|---|---|---|
| `Outcome` | string | Stable outcome key. |
| `Message` | string | User-facing confirmation message. |

### Approve Checklist Version For Publishing

Custom API:

`int_ApproveChecklistVersionForPublishing`

Bound table:

`int_checklistversion`

HTTP call shape:

```http
POST /api/data/v9.2/int_checklistversions(<checklist-version-id>)/Microsoft.Dynamics.CRM.int_ApproveChecklistVersionForPublishing
```

Request body:

```json
{
  "ReviewDecision": 100000000,
  "Reason": "Optional reviewer comments"
}
```

Request parameters:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `ReviewDecision` | picklist/integer | Yes | Uses the `int_reviewdecision` choice values. |
| `Reason` | string | Conditionally | Required for Rejected and Requires Amendments. Optional for Approved. |

`ReviewDecision` values:

| Value | Label | UI action |
|---:|---|---|
| `100000000` | Approved | Approve and publish. |
| `200000000` | Rejected | Reject version. |
| `300000000` | Requires Amendments | Return version to draft for amendment. |

Do not send responded-by or responded-on values. The plugin uses:

- `context.InitiatingUserId` for `int_reviewedby`
- `context.OperationCreatedOn` for `int_reviewedon`

Possible response outcomes:

| Outcome | Meaning |
|---|---|
| `approvedAndPublished` | Version was approved and published. |
| `requiresAmendments` | Version was returned to Draft, and parent checklist moved to Requires Attention. |
| `rejected` | Version was rejected, and parent checklist moved to Requires Attention. |

Response body fields:

| Field | Type | Purpose |
|---|---|---|
| `Outcome` | string | Stable outcome key. |
| `Message` | string | User-facing confirmation message. |

## Expected UI Buttons

### Draft Version

If checklist version status is Draft:

- If review is required, show `Submit for Approval`.
- If review is not required, show `Publish`.

Both states call:

`int_SubmitOrPublishDraftChecklistVersion`

The server decides whether the draft is submitted or published.

### Pending Review Version

If checklist version status is Pending Review and the current user is allowed to review, show review actions:

- `Approve`
- `Requires Amendments`
- `Reject`

All three call:

`int_ApproveChecklistVersionForPublishing`

Use these payloads:

Approve:

```json
{
  "ReviewDecision": 100000000,
  "Reason": "Optional reviewer comments"
}
```

Requires Amendments:

```json
{
  "ReviewDecision": 300000000,
  "Reason": "Reason is required"
}
```

Reject:

```json
{
  "ReviewDecision": 200000000,
  "Reason": "Reason is required"
}
```

The plugin enforces reviewer permission using the security role:

`int_ops_checklistversionapprover`

The UI can hide/disable review actions if it already knows the user lacks permission, but the server remains authoritative.

## Response Handling

For all successful responses:

1. Read `Outcome` and `Message`.
2. Show `Message` in a toast/dialog.
3. Refresh the current checklist version record from Dataverse.
4. Refresh parent checklist data if the editor keeps parent checklist status/version snapshot in local state.

Recommended UI handling by `Outcome`:

| Outcome | UI handling |
|---|---|
| `submittedForReview` | Show confirmation, close edit mode if appropriate, reload version. |
| `published` | Show confirmation, reload version and parent checklist/version snapshot. |
| `approvedAndPublished` | Show confirmation, reload version and parent checklist/version snapshot. |
| `requiresAmendments` | Show confirmation, reload version; it should now be Draft. |
| `rejected` | Show confirmation, reload version; it should now be Rejected/inactive. |

Prefer refreshing after success rather than relying on Custom API response fields for statuses. The response is intentionally small.

## Error Handling

The plugin throws `InvalidPluginExecutionException` for business-rule failures. The editor should surface the Dataverse error message where practical.

Common expected failures:

- Target record is not a checklist version.
- Version is not Draft when calling submit/publish.
- Version is not Pending Review when calling review.
- Definition JSON is empty.
- Version number is missing when publishing.
- Review is not required, but review API was called.
- Caller does not have `int_ops_checklistversionapprover`.
- `Reason` is missing for Rejected or Requires Amendments.
- Review is required, but direct publish is attempted server-side.

Recommended client pattern:

- Disable the clicked button while the API call is running.
- Prevent duplicate submissions.
- Show a friendly generic error if Dataverse does not return a readable message.
- Always re-enable controls after failure.

## Status Values

`int_checklistversion.statuscode`

| Value | Label |
|---:|---|
| `100000000` | Draft |
| `100000010` | Pending Review |
| `100000020` | Published |
| `100000030` | Rejected |
| `100000040` | Cancelled |
| `100000050` | Superseded |
| `100000060` | Archived |

`int_checklist.statuscode`

| Value | Label |
|---:|---|
| `100000000` | Requires Attention |
| `100000010` | Pending Review |
| `100000020` | Published |
| `100000030` | Cancelled |
| `100000040` | Archived |

## Server-Side Fields Updated By Plugins

Submit for review:

- `int_submissioncomments`
- `int_submittedby`
- `int_submittedon`
- checklist version `statecode` / `statuscode`
- parent checklist `statecode` / `statuscode`

Review:

- `int_reviewdecision`
- `int_reviewreason`
- `int_reviewedby`
- `int_reviewedon`
- checklist version `statecode` / `statuscode`
- parent checklist `statecode` / `statuscode`

Publish:

- checklist version `int_definitionhash`
- checklist version `int_publishedby`
- checklist version `int_publishedon`
- checklist version `statecode` / `statuscode`
- previous published versions become Superseded
- parent checklist `int_versionsnapshot`
- parent checklist `int_version`
- parent checklist `statecode` / `statuscode`
