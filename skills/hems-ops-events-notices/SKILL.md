---
name: hems-ops-events-notices
description: Create realistic HEMS Ops Dataverse crew-app events and notices for the London air ambulance environment. Use when Codex needs to seed or update int_event and int_notice records, set visibility start/end dates, or populate base-site visibility link tables int_eventbasesite and int_noticebasesite for HEMS Ops.
---

# HEMS Ops Events And Notices

Use this skill to create realistic operational `int_event` and `int_notice` records in the HEMS Ops Dataverse dev environment.

## Required Companion Skills

Start with:

- `dv-overview` for Dataverse routing and environment safety.
- `dv-query` for reading schema, base sites, existing records, or verification data.
- `dv-data` for creating or updating records.

For this repo, the intended environment is already confirmed by `AGENTS.md`:

```text
https://hemsops-v2-dev.crm11.dynamics.com/
```

Still run `pac org who` before writing and verify the active org URL matches the URL above. Do not write if it does not match.

## Workflow

1. Work from `/Users/edgaraskarpavicius/Developer/HEMS Ops - Power Apps`.
2. Verify `.env` and `scripts/auth.py` exist. If missing, follow `dv-connect`.
3. Run `pac org who` and verify `Org URL` is `https://hemsops-v2-dev.crm11.dynamics.com/`.
4. Read current base sites from `int_basesite`; do not assume only Heathrow and Sunbury exist.
5. Read or confirm schema using `references/schema.md` and live metadata if unsure.
6. Create parent records in `int_event` and/or `int_notice`.
7. Create corresponding visibility link records in `int_eventbasesite` and/or `int_noticebasesite`.
8. Verify by reading back parent records and link records, including formatted lookup values.

## Content Guidance

Write content that feels plausible for London air ambulance operations:

- Multi-agency exercises with LAS, Met Police, London Fire Brigade, airport operations, major trauma centres, or clinical governance.
- Base-specific notices for Heathrow airside access, Sunbury facilities, fuel/maintenance, drug checks, kit readiness, heat/cold weather precautions, or temporary access restrictions.
- Use visibility windows intentionally. Active items should have `int_visibilitystart` on or before the current date and `int_visibilityend` after it. Future items should have a future visibility start when crews should not see them yet.
- Keep `int_showforbasesites` aligned with the link-table rows, e.g. `Heathrow; Sunbury`.

## Implementation Notes

Use Python and the repo auth helper. The script at `scripts/seed_events_notices.py` is a reusable template; copy it to `/private/tmp` or adapt it in place only if the user wants a persistent repo script.

Important Dataverse details:

- `int_visibilitystart`, `int_visibilityend`, `int_eventdate`, `int_startdate`, and `int_enddate` accept date-only values. Send `YYYY-MM-DD`, not `YYYY-MM-DDTHH:mm:ssZ`.
- Priority choice values are `1 = Critical`, `2 = High`, `3 = Normal`, `4 = Low`.
- Event link records use `int_Event@odata.bind` and `int_BaseSite@odata.bind`.
- Notice link records use `int_Notice@odata.bind` and `int_BaseSite@odata.bind`.
- Use entity set names in binds: `/int_events(<guid>)`, `/int_notices(<guid>)`, `/int_basesites(<guid>)`.

## Verification

After writes, read back:

- `int_event`: `int_eventid`, `int_name`, `int_priority`, `int_eventdate`, `int_visibilitystart`, `int_visibilityend`, `int_showforbasesites`.
- `int_notice`: `int_noticeid`, `int_name`, `int_priority`, `int_visibilitystart`, `int_visibilityend`, `int_showforbasesites`.
- `int_eventbasesite`: `int_name`, `_int_event_value`, `_int_basesite_value`.
- `int_noticebasesite`: `int_name`, `_int_notice_value`, `_int_basesite_value`.

Include `OData.Community.Display.V1.FormattedValue` annotations when reading links so the final response can name the base sites clearly.
