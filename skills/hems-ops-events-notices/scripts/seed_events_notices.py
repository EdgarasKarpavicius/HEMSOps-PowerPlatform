#!/usr/bin/env python3
"""Template for seeding HEMS Ops event/notice records and base-site visibility links.

Run from the HEMS Ops Power Apps repo root after editing EVENT_DEFINITIONS
and NOTICE_DEFINITIONS for the user's requested content.
"""

import os
import subprocess
import sys

TARGET_URL = "https://hemsops-v2-dev.crm11.dynamics.com/"

EVENT_DEFINITIONS = [
    {
        "int_name": "Example Multi-Agency Exercise",
        "int_description": "Replace with a realistic operational event description.",
        "int_priority": 3,
        "int_eventdate": "2026-07-01",
        "int_startdate": "2026-07-01",
        "int_enddate": "2026-07-01",
        "int_visibilitystart": "2026-06-21",
        "int_visibilityend": "2026-07-02",
        "int_descriptionvisibilityincrewapphomescreen": True,
        "bases": ["Heathrow", "Sunbury"],
    },
]

NOTICE_DEFINITIONS = [
    {
        "int_name": "Example Crew Notice",
        "int_description": "Replace with a realistic operational notice description.",
        "int_priority": 2,
        "int_visibilitystart": "2026-06-21",
        "int_visibilityend": "2026-07-05",
        "int_descriptionvisibilityincrewapphomescreen": True,
        "bases": ["Heathrow"],
    },
]


def assert_pac_org():
    result = subprocess.run(
        ["pac", "org", "who"],
        check=True,
        text=True,
        capture_output=True,
    )
    if f"Org URL:                    {TARGET_URL}" not in result.stdout:
        raise RuntimeError(
            f"PAC active org is not {TARGET_URL}. Output:\n{result.stdout}"
        )


def load_client():
    sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
    from auth import get_client

    return get_client("dv-data")


def all_rows(client, table, **kwargs):
    rows = []
    for page in client.records.get(table, **kwargs):
        rows.extend(page)
    return rows


def get_base_sites(client):
    rows = all_rows(
        client,
        "int_basesite",
        select=["int_basesiteid", "int_name"],
        orderby=["int_name asc"],
    )
    by_name = {row.get("int_name"): row.get("int_basesiteid") for row in rows}
    requested = {
        base
        for item in EVENT_DEFINITIONS + NOTICE_DEFINITIONS
        for base in item["bases"]
    }
    missing = sorted(requested - set(by_name))
    if missing:
        raise RuntimeError(f"Missing base sites: {', '.join(missing)}")
    return by_name


def get_existing_by_name(client, table, id_column, names):
    wanted = set(names)
    rows = all_rows(client, table, select=[id_column, "int_name"])
    return {
        row.get("int_name"): row.get(id_column)
        for row in rows
        if row.get("int_name") in wanted
    }


def create_parent_records(client, table, id_column, definitions):
    existing = get_existing_by_name(
        client, table, id_column, [item["int_name"] for item in definitions]
    )
    created = {}
    to_create = []
    for item in definitions:
        if item["int_name"] in existing:
            continue
        record = {key: value for key, value in item.items() if key != "bases"}
        record["int_showforbasesites"] = "; ".join(item["bases"])
        to_create.append(record)

    if to_create:
        guids = client.records.create(table, to_create)
        for record, guid in zip(to_create, guids):
            created[record["int_name"]] = guid

    return {**existing, **created}, created


def existing_links(client, table, parent_lookup):
    rows = all_rows(
        client,
        table,
        select=[f"_{parent_lookup}_value", "_int_basesite_value"],
    )
    return {
        (
            row.get(f"_{parent_lookup}_value", "").lower(),
            row.get("_int_basesite_value", "").lower(),
        )
        for row in rows
        if row.get(f"_{parent_lookup}_value") and row.get("_int_basesite_value")
    }


def create_links(
    client,
    table,
    parent_nav,
    parent_lookup,
    parent_set,
    parent_ids,
    definitions,
    base_sites,
):
    seen = existing_links(client, table, parent_lookup)
    records = []
    for item in definitions:
        parent_id = parent_ids[item["int_name"]]
        for base_name in item["bases"]:
            base_id = base_sites[base_name]
            if (parent_id.lower(), base_id.lower()) in seen:
                continue
            records.append(
                {
                    "int_name": f"{item['int_name']} - {base_name}",
                    f"{parent_nav}@odata.bind": f"/{parent_set}({parent_id})",
                    "int_BaseSite@odata.bind": f"/int_basesites({base_id})",
                }
            )

    return client.records.create(table, records) if records else []


def main():
    assert_pac_org()
    with load_client() as client:
        base_sites = get_base_sites(client)

        event_ids, created_events = create_parent_records(
            client, "int_event", "int_eventid", EVENT_DEFINITIONS
        )
        notice_ids, created_notices = create_parent_records(
            client, "int_notice", "int_noticeid", NOTICE_DEFINITIONS
        )

        event_links = create_links(
            client,
            "int_eventbasesite",
            "int_Event",
            "int_event",
            "int_events",
            event_ids,
            EVENT_DEFINITIONS,
            base_sites,
        )
        notice_links = create_links(
            client,
            "int_noticebasesite",
            "int_Notice",
            "int_notice",
            "int_notices",
            notice_ids,
            NOTICE_DEFINITIONS,
            base_sites,
        )

    print(f"Created events: {len(created_events)}")
    print(f"Created notices: {len(created_notices)}")
    print(f"Created event-base links: {len(event_links)}")
    print(f"Created notice-base links: {len(notice_links)}")


if __name__ == "__main__":
    main()
