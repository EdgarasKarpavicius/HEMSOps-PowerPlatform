# Checklist Version Publish Actions

## Overview

Checklist version publishing should be split into three workflow plugin responsibilities, plus one protection plugin:

1. Submit a draft checklist version for review.
2. Approve a pending-review checklist version for publishing.
3. Run the core publish logic.
4. Protect published checklist version fields from later mutation.

The first two actions are user-facing workflow actions and should be surfaced as Dataverse Custom APIs for the React checklist editor to call. The core publish action should be shared server-side plugin logic, not a directly surfaced Custom API.

The editor route is controlled by the app setting:

`int_RequireChecklistVersionReview`

When the setting is `true`, the editor button is `Submit for Approval`. When the setting is `false`, the editor button is `Publish`.

If the setting cannot be read, the editor defaults to `true`, meaning review is required.

## Existing Editor Payloads

The React editor already models the submit payload as:

```ts
type ChecklistVersionSubmissionPayload = {
    submissionComments: string;
    submittedByUserId: string;
    submittedOn: string;
};
```

The React editor already models the review payload as:

```ts
type ChecklistVersionReviewPayload = {
    outcome: "reject" | "requiresAmendments" | "approve";
    reason: string;
    respondedByUserId: string;
    respondedOn: string;
};
```

These fields should be reflected in the surfaced Custom API request parameters, alongside the target checklist version reference.

The server should use Dataverse plugin context for authoritative actor/time fields. Client-provided user ids and timestamps can be accepted for display parity with the editor payload, but security and audit decisions should use:

- `context.InitiatingUserId`
- plugin/server execution time

## Custom API Responses

The surfaced Custom APIs should return enough structured information for the React editor to show a tailored confirmation and refresh the current record.

Suggested response fields:

| Response | Purpose |
|---|---|
| `Outcome` | Stable outcome key, such as `submittedForReview`, `published`, `approvedAndPublished`, `requiresAmendments`, or `rejected`. |
| `Message` | Human-readable confirmation text suitable for a toast/dialog. |
| `ChecklistVersionId` | The processed `int_checklistversion` id. |
| `ChecklistVersionStatusCode` | Final checklist version `statuscode`. |
| `ChecklistId` | Parent `int_checklist` id. |
| `ChecklistStatusCode` | Final parent checklist `statuscode`. |
| `VersionSnapshotId` | Current parent `int_versionsnapshot` lookup value, populated only when a version is published. |

## Plugin 1: Submit or Publish Draft

Suggested Custom API:

`int_SubmitOrPublishDraftChecklistVersion`

This action is called by the editor draft action button. It reads `int_RequireChecklistVersionReview` and chooses the correct route:

- When `true`, submit the draft checklist version for approval.
- When `false`, call the shared core publish logic directly.

### Surface as Custom API

This plugin should be registered behind a Dataverse Custom API because it is called directly from the React checklist editor.

Suggested parameters:

| Parameter | Purpose |
|---|---|
| `Target` | Entity reference for the `int_checklistversion` being submitted. |
| `SubmissionComments` | Comments entered by the submitter. Maps to `submissionComments`. |
| `SubmittedByUserId` | User id captured by the editor. Maps to `submittedByUserId`. |
| `SubmittedOn` | Client timestamp captured by the editor. Maps to `submittedOn`. |

The server can still use Dataverse context for the authoritative calling user and operation time. The client values are useful for audit display, but should not be trusted over server context where security matters.

### Required Checks

- `Target` must exist.
- `Target` must reference `int_checklistversion`.
- The checklist version must currently be Draft:
  - `statecode = 0`
  - `statuscode = 100000000`
- The checklist version must have a valid parent `int_checklist`.
- Required definition fields must be present, including the checklist definition JSON/hash fields used by the version.
- `int_RequireChecklistVersionReview` must be read server-side to decide the route.

### Main Logic

When `int_RequireChecklistVersionReview = true`:

- Store the submission comments and submission metadata.
- Use plugin context as the authoritative submitted-by user and submitted-on time.
- Move the checklist version to Pending Review:
  - `statecode = 0`
  - `statuscode = 100000010`
- Update the parent `int_checklist`, found through the checklist version lookup `int_checklist`, to Pending Review:
  - `statecode = 0`
  - `statuscode = 100000010`
- Do not publish the version.

When `int_RequireChecklistVersionReview = false`:

- Do not require reviewer inputs.
- Call the shared core publish logic for the draft checklist version.
- Return an API response indicating the version was published directly.

## Plugin 2: Approve for Publishing

Suggested Custom API:

`int_ApproveChecklistVersionForPublishing`

This action is called when a pending-review checklist version is approved by a human reviewer.

### Surface as Custom API

This plugin should be registered behind a Dataverse Custom API because it is called directly from the React checklist editor review buttons.

Suggested parameters:

| Parameter | Purpose |
|---|---|
| `Target` | Entity reference for the `int_checklistversion` being reviewed. |
| `Outcome` | Review outcome. Maps to `outcome`. |
| `Reason` | Review comments/reason. Maps to `reason`. |
| `RespondedByUserId` | User id captured by the editor. Maps to `respondedByUserId`. |
| `RespondedOn` | Client timestamp captured by the editor. Maps to `respondedOn`. |

The editor supports three outcomes:

| Outcome | Expected behavior |
|---|---|
| `approve` | Validate approver permission, record approval metadata, then call core publish logic. |
| `requiresAmendments` | Record response metadata and move the version out of review so it can be amended. |
| `reject` | Record response metadata and reject the version. |

### Required Checks

- `Target` must exist.
- `Target` must reference `int_checklistversion`.
- The checklist version must currently be Pending Review:
  - `statecode = 0`
  - `statuscode = 100000010`
- `int_RequireChecklistVersionReview` must be `true`.
- The caller must have the checklist version approver security role:
  - `int_ops_checklistversionapprover`
- The checklist version must have a valid parent `int_checklist`.
- The review outcome must be one of:
  - `approve`
  - `requiresAmendments`
  - `reject`
- For `reject` and `requiresAmendments`, a non-empty reason should be required.

### Main Logic

For `approve`:

- Store approval response metadata, using plugin context as the authoritative reviewer and response time.
- Write any reviewer comments/reason to `int_reviewreason` if provided.
- Call the shared core publish plugin/service logic.
- Do not duplicate publish behavior inside the approval plugin.
- The shared publish logic should set:
  - checklist version `statuscode = 100000020` Published
  - parent checklist `statuscode = 100000020` Published
- Return an API response indicating the version was approved and published.

For `requiresAmendments`:

- Write the reviewer's comments/reason to `int_reviewreason` on the checklist version.
- Move the checklist version back to Draft so it can be amended:
  - `statecode = 0`
  - `statuscode = 100000000`
- Update the parent `int_checklist`, found through the checklist version lookup `int_checklist`, to Requires Attention:
  - `statecode = 0`
  - `statuscode = 100000000`
- Do not update `int_versionsnapshot`.
- Return an API response indicating amendments are required.

For `reject`:

- Write the reviewer's comments/reason to `int_reviewreason` on the checklist version.
- Move the checklist version to Rejected:
  - `statecode = 1`
  - `statuscode = 100000030`
- Update the parent `int_checklist`, found through the checklist version lookup `int_checklist`, to Requires Attention:
  - `statecode = 0`
  - `statuscode = 100000000`
- Do not update `int_versionsnapshot`.
- Return an API response indicating the version was rejected.

## Plugin 3: Core Publish Logic

Suggested internal service/plugin class:

`PublishChecklistVersion`

This should contain the single canonical publish implementation. It should not be surfaced as a Custom API because users should publish through either:

- `int_SubmitOrPublishDraftChecklistVersion` followed by `int_ApproveChecklistVersionForPublishing`, when review is required.
- `int_SubmitOrPublishDraftChecklistVersion`, when review is not required, which calls this server-side logic directly.

The important design point is that the publish lifecycle logic lives in one place.

### Required Checks

The core publish logic should still defend itself even if it is only called server-side.

- `Target` must exist.
- `Target` must reference `int_checklistversion`.
- The checklist version must have a valid parent `int_checklist`.
- The checklist version must be in a publishable status.
- The checklist version must have a non-empty `int_definitionjson` value.
- The app setting `int_RequireChecklistVersionReview` must be checked as a fail-safe.
- If review is required, the publish call must be made from the approval path after the approver role and `approve` outcome have been validated.

Allowed transitions:

| Setting | Allowed source status | Publish allowed when |
|---|---|---|
| `int_RequireChecklistVersionReview = true` | Pending Review | Approval plugin has validated reviewer authority and is calling publish after an approve outcome. |
| `int_RequireChecklistVersionReview = false` | Draft | Direct publish is allowed with no reviewer input. |

Rejected, cancelled, archived, superseded, and already-published versions should not be directly publishable.

### Transaction and Concurrency

The core publish operation should run as one Dataverse transaction where possible. If any part of publishing fails, none of the related mutations should persist.

The publish transaction includes:

- writing `int_definitionhash`
- setting the current version to Published
- superseding previous published versions
- updating the parent checklist `int_versionsnapshot`
- updating the parent checklist status

Because two users could publish related checklist versions close together, the core publish logic should re-read related published versions inside the transaction before making changes. At the end of the transaction, there should be only one non-superseded Published version for the parent checklist.

### Main Logic

- Read `int_definitionjson` from the checklist version being published.
- Generate a SHA-256 hash from the exact `int_definitionjson` payload that is being published.
- Write the generated hash to `int_definitionhash` on the checklist version as part of the same publishing transaction.
- Set the target checklist version to Published:
  - `statecode = 1`
  - `statuscode = 100000020`
- Load the parent `int_checklist` through the checklist version lookup `int_checklist`.
- Update the parent checklist's current version lookup to the checklist version being published:
  - `int_versionsnapshot = <EntityReference to current int_checklistversion>`
- Fetch all other checklist versions related to the same parent checklist where:
  - `int_checklist = <parent checklist id>`
  - `statuscode = 100000020`
  - record id is not the current checklist version id
- Mark any previously published checklist versions found by that query as Superseded:
  - `statecode = 1`
  - `statuscode = 100000050`
- Sync the parent `int_checklist` to Published:
  - `statecode = 0`
  - `statuscode = 100000020`

## Plugin 4: Protect Published Version Fields

Suggested plugin class:

`ProtectPublishedChecklistVersionFields`

This plugin should block changes to key immutable fields once a checklist version is inactive.

It should also control attempts to change `statecode` or `statuscode` on an already inactive version, but only when the organization requires checklist version review.

### Trigger

Register on update of `int_checklistversion`, ideally pre-operation, for protected fields such as:

- `int_definitionjson`
- `int_definitionhash`
- `statecode`
- `statuscode`

Additional fields can be protected later if they are part of the published definition contract.

### Required Checks

- Load or inspect the current checklist version state.
- If the existing checklist version is inactive:
  - `statecode = 1`
- Reject updates that attempt to change protected fields.
- If the update attempts to change `statecode` or `statuscode` while the existing version has `statecode = 1`, read `int_RequireChecklistVersionReview`.
- When `int_RequireChecklistVersionReview = true`, only allow that inactive-state/status change if the calling user has the checklist version approver security role:
  - `int_ops_checklistversionapprover`
- When `int_RequireChecklistVersionReview = false`, do not enforce the reviewer-role protection for making an inactive version active again or changing its lifecycle status.

### Main Logic

- Throw a plugin exception when protected fields are changed on an inactive checklist version.
- Throw a plugin exception when an inactive checklist version's `statecode` or `statuscode` is changed by a user without `int_ops_checklistversionapprover`, but only if `int_RequireChecklistVersionReview = true`.
- Allow non-protected operational updates only if they do not alter the published definition contract.
- Do not block the core publish plugin itself from writing `int_definitionhash` and Published status as part of the initial publish transaction.

## Status Values

### `int_checklistversion.statuscode`

| Value | Label |
|---:|---|
| `100000000` | Draft |
| `100000010` | Pending Review |
| `100000020` | Published |
| `100000030` | Rejected |
| `100000040` | Cancelled |
| `100000050` | Superseded |
| `100000060` | Archived |

### `int_checklist.statuscode`

| Value | Label |
|---:|---|
| `100000000` | Requires Attention |
| `100000010` | Pending Review |
| `100000020` | Published |
| `100000030` | Cancelled |
| `100000040` | Archived |

## Recommended Call Flow

### Review Required

```text
React editor
  -> int_SubmitOrPublishDraftChecklistVersion
      -> Pending Review

Approver in React editor
  -> int_ApproveChecklistVersionForPublishing
      -> check int_ops_checklistversionapprover role
      -> record approval
      -> shared core publish logic
          -> Published
```

### Review Not Required

```text
React editor
  -> int_SubmitOrPublishDraftChecklistVersion
      -> shared core publish logic
          -> check int_RequireChecklistVersionReview = false
          -> Published
```

## Key Principle

The submit and approve plugins own the workflow gates. The core publish plugin/service owns the lifecycle mutation. Publish behavior should be implemented once and protected by its own validation, even when it is only called by trusted server-side code.
