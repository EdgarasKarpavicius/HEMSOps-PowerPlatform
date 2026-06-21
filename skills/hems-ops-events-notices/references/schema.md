# HEMS Ops Event And Notice Schema

Target Dataverse environment:

```text
https://hemsops-v2-dev.crm11.dynamics.com/
```

## Tables

| Logical name | Entity set | Primary id | Primary name |
| --- | --- | --- | --- |
| `int_event` | `int_events` | `int_eventid` | `int_name` |
| `int_notice` | `int_notices` | `int_noticeid` | `int_name` |
| `int_basesite` | `int_basesites` | `int_basesiteid` | `int_name` |
| `int_eventbasesite` | `int_eventbasesites` | `int_eventbasesiteid` | `int_name` |
| `int_noticebasesite` | `int_noticebasesites` | `int_noticebasesiteid` | `int_name` |

## Parent Columns

`int_event`:

- `int_name`: title.
- `int_description`: short operational description.
- `int_priority`: choice, see priority values below.
- `int_eventdate`: date-only.
- `int_startdate`: date-only.
- `int_enddate`: date-only.
- `int_visibilitystart`: date-only. Controls when crews start seeing the record.
- `int_visibilityend`: date-only. Controls when crews stop seeing the record.
- `int_showforbasesites`: memo display helper, usually semicolon-separated base-site names.
- `int_descriptionvisibilityincrewapphomescreen`: boolean.

`int_notice`:

- `int_name`: title.
- `int_description`: short operational description.
- `int_priority`: choice, see priority values below.
- `int_visibilitystart`: date-only. Controls when crews start seeing the record.
- `int_visibilityend`: date-only. Controls when crews stop seeing the record.
- `int_showforbasesites`: memo display helper, usually semicolon-separated base-site names.
- `int_descriptionvisibilityincrewapphomescreen`: boolean.

Priority choice values:

| Value | Label |
| --- | --- |
| `1` | Critical |
| `2` | High |
| `3` | Normal |
| `4` | Low |

## Visibility Link Tables

`int_eventbasesite` creates event visibility links:

- Parent lookup logical column: `int_event`.
- Parent navigation property: `int_Event`.
- Base-site lookup logical column: `int_basesite`.
- Base-site navigation property: `int_BaseSite`.
- Example bind keys:
  - `int_Event@odata.bind`: `/int_events(<event-guid>)`
  - `int_BaseSite@odata.bind`: `/int_basesites(<base-site-guid>)`

`int_noticebasesite` creates notice visibility links:

- Parent lookup logical column: `int_notice`.
- Parent navigation property: `int_Notice`.
- Base-site lookup logical column: `int_basesite`.
- Base-site navigation property: `int_BaseSite`.
- Example bind keys:
  - `int_Notice@odata.bind`: `/int_notices(<notice-guid>)`
  - `int_BaseSite@odata.bind`: `/int_basesites(<base-site-guid>)`

## Known Base Sites From 2026-06-21

These existed in dev when this skill was created. Always read live data before using them.

| Name | GUID |
| --- | --- |
| Heathrow | `7b156044-d063-f111-ab0c-7c1e5203af4d` |
| Sunbury | `ae306b34-d063-f111-ab0c-7c1e5203af4d` |
