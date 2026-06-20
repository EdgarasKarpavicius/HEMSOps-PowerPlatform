# Checklist Status Sync Handoff

## Tables

### `int_checklist`

Parent checklist identity. This table should summarize the usable/current lifecycle of the checklist as a whole. It should not store the checklist JSON definition.

### `int_checklistversion`

Versioned checklist definition. This table owns:

- `int_definitionjson`
- `int_definitionhash`
- `int_versionnumber`
- checklist version lifecycle status

## `int_checklistversion.statuscode`

### Active `statecode = 0`

| Value | Label | Color | Meaning |
|---:|---|---|---|
| `100000000` | Draft | `#605E5C` | Editable working version. |
| `100000010` | Pending Review | `#F7B731` | Submitted for review/approval. |

### Inactive `statecode = 1`

| Value | Label | Color | Meaning |
|---:|---|---|---|
| `1` | Active (Legacy) | `#605E5C` | Backwards compatibility only. |
| `100000020` | Published | `#107C10` | Published immutable version. |
| `100000030` | Rejected | `#D13438` | Review rejected; can be amended into a new draft. |
| `100000040` | Cancelled | `#8A8886` | Draft/review abandoned. |
| `100000050` | Superseded | `#0078D4` | Previously published version replaced by a newer published version. |
| `100000060` | Archived | `#5C2D91` | Hidden from normal use, retained for audit. |

## `int_checklist.statuscode`

### Active `statecode = 0`

| Value | Label | Color | Meaning |
|---:|---|---|---|
| `1` | Active (Legacy) | `#107C10` | Backwards compatibility only. |
| `100000000` | Requires Attention | `#D83B01` | Parent is not usable yet or latest/main version needs work. |
| `100000010` | Pending Review | `#F7B731` | Main version is waiting for approval. |
| `100000020` | Published | `#107C10` | Checklist has a usable published version. |

### Inactive `statecode = 1`

| Value | Label | Color | Meaning |
|---:|---|---|---|
| `2` | Inactive (Legacy) | `#8A8886` | Backwards compatibility only. |
| `100000030` | Cancelled | `#8A8886` | Checklist setup abandoned before becoming useful. |
| `100000040` | Archived | `#5C2D91` | Hidden from normal selectors/views, retained for audit. |

## Sync Intent

The future plugin should keep `int_checklist.statuscode` and `int_checklist.statecode` in sync with the main/current checklist version state.

`int_checklist` should not expose version-specific statuses such as `Superseded`. Superseded is a version-only concept.

## Suggested Sync Rules

| Version condition | Checklist status |
|---|---|
| No version exists | Requires Attention |
| Main version is Draft | Requires Attention |
| Main version is Rejected | Requires Attention |
| Main version is Pending Review | Pending Review |
| Main version is Published | Published |
| Main version is Cancelled | Cancelled |
| Main version is Archived | Archived |
| A version becomes Superseded | Do not set checklist to Superseded. Re-evaluate the current/main version. |

## Suggested Plugin Trigger Points

Register plugin logic on:

- `int_checklistversion` create
- `int_checklistversion` update of `statecode`
- `int_checklistversion` update of `statuscode`
- any future field that marks a version as main/current

The plugin should locate the parent `int_checklist`, determine the current/main version, map the version status to the parent checklist status, then update the parent only when the parent status/state differs.

## Open Design Point

The sync plugin needs a reliable way to determine the main/current version. Recommended options:

- Add a boolean such as `int_ismainversion` or `int_iscurrent` to `int_checklistversion`.
- Add a lookup on `int_checklist`, such as `int_currentchecklistversion`.
- Infer from highest `int_versionnumber` plus status precedence, though this is less explicit.
