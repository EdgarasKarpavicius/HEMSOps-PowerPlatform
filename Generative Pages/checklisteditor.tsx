import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Caption1,
    Checkbox,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Dropdown,
    Field,
    Input,
    MessageBar,
    MessageBarBody,
    Option,
    Spinner,
    Tab,
    TabList,
    Text,
    Textarea,
    Tooltip,
    Tree,
    TreeItem,
    TreeItemLayout,
    makeStyles,
    shorthands,
    tokens,
    useArrowNavigationGroup,
} from "@fluentui/react-components";
import {
    AddRegular,
    CheckmarkRegular,
    ChevronDownRegular,
    ChevronRightRegular,
    DeleteRegular,
    DismissRegular,
    EditRegular,
    PrintRegular,
    RibbonRegular,
    SaveRegular,
    SendRegular,
    TagRegular,
    WarningRegular,
} from "@fluentui/react-icons";

declare const Xrm: any;

type Checklist = {
    id?: string;
    name: string;
    checklistType: string;
    checklistTypeValue: number;
    targetType: string;
    targetTypeValue: number;
    sections: ChecklistSection[];
};

type ChecklistVersion = {
    id?: string;
    versionNumber: string;
    description: string;
    versionType: number;
    statecode: number;
    statuscode: number;
    statusLabel?: string;
    submittedBy?: string;
    submittedOn?: string;
    submissionComments?: string;
    reviewedBy?: string;
    reviewedOn?: string;
    reviewDecision?: number | null;
    reviewDecisionLabel?: string;
    reviewReason?: string;
    history: ChecklistVersionHistoryEntry[];
    definition: ChecklistVersionDefinition;
    checklist: Checklist;
};

type ChecklistVersionHistoryEntry = {
    id: string;
    eventType: number | null;
    eventTypeLabel: string;
    eventOn: string;
    eventBy: string;
    title: string;
    description: string;
    comments: string;
    reviewDecision: number | null;
    reviewDecisionLabel: string;
    fromStatus: number | null;
    fromStatusLabel: string;
    toStatus: number | null;
    toStatusLabel: string;
    detailsJson: string;
    createdOn: string;
};

type ChecklistVersionOption = {
    key: string;
    value: boolean | number | string;
};

type LatestChecklistVersionOption = {
    id: string;
    label: string;
    modifiedOn: string;
} | null;

type AppliesToSelection = {
    entityName: string;
    id: string;
    name: string;
    category?: string;
};

type ChecklistVersionDetails = {
    checklistName: string;
    versionType: number;
    versionNumber: string;
    description: string;
    appliesTo: AppliesToSelection | null;
    options: ChecklistVersionOption[];
};

type ChecklistVersionDefinition = {
    checklistVersionDetails: ChecklistVersionDetails;
    checklistVersionContents: {
        sections: ChecklistSection[];
    };
};

type ChecklistSection = {
    id: string;
    name: string;
    bulkServiceable: boolean;
    parentId?: string | null;
    sections: ChecklistSection[];
    items: ChecklistItem[];
};

type ChecklistItem = {
    id: string;
    name: string;
    description: string;
    quantity: number | null;
    requestItemIdentification: boolean;
    identificationTargetTypeValue: number | null;
    identificationTarget: IdentificationTargetOption | null;
    requiresChecklistRuns: boolean;
    requiredChecklistRuns: RequiredChecklistRunOption[];
};

type GenerativePageInput = {
    pageType?: string;
    pageId?: string;
    entityName?: string;
    recordId?: string;
    data?: Record<string, any>;
};

type StatusOption = {
    text: string;
    color?: string;
};

type AppliesToOption = AppliesToSelection;

type IdentificationTargetOption = {
    id: string;
    name: string;
    targetTypeValue: number;
    entityName: string;
    groupId?: string;
    groupName?: string;
};

type IdentificationTargetGroup = {
    id: string;
    name: string;
    options: IdentificationTargetOption[];
};

type IdentificationOptionsByTarget = Record<number, IdentificationTargetGroup[]>;

type RequiredChecklistRunOption = {
    id: string;
    name: string;
    versionSnapshotId: string;
    versionNumber?: string;
    required?: boolean;
    guidance?: string;
};

type AppliesToTargetDefinition = {
    entityName: string;
    idField: string;
    label: string;
    categoryLookup?: string;
};

type FlatChecklistSection = {
    section: ChecklistSection;
    depth: number;
};

type DraftSection = {
    parentId: string | null;
    afterSectionId?: string | null;
    name: string;
};

type DraftItem = {
    sectionId: string;
    itemId?: string;
    afterItemId?: string | null;
    name: string;
    description: string;
    quantity: string;
    requestItemIdentification: boolean;
    identificationCategoryId: string;
    identificationTargetTypeValue: number | null;
    identificationTargetId: string;
    identificationTarget: IdentificationTargetOption | null;
    requiresChecklistRuns: boolean;
    requiredChecklistRunIds: string[];
    requiredChecklistRuns: RequiredChecklistRunOption[];
};

type DraggedItem =
    | { type: "section"; id: string }
    | { type: "item"; id: string; sectionId: string }
    | null;

type DragOverTarget =
    | { type: "section"; id: string; placement?: "before" | "after" | "child" }
    | { type: "invalidSectionChild"; id: string; reason: string }
    | { type: "item"; id: string; placement?: "before" | "after" }
    | { type: "sectionChildrenEnd"; parentId: string }
    | null;

type SectionDropIndicator = {
    kind: "line" | "box";
    top: number;
    left: number;
    width: number;
    height: number;
    label: string;
    tone: "brand" | "danger";
} | null;

function areDragOverTargetsEqual(left: DragOverTarget, right: DragOverTarget): boolean {
    if (left === right) return true;
    if (!left || !right || left.type !== right.type) return false;
    if (left.type === "sectionChildrenEnd" && right.type === "sectionChildrenEnd") {
        return left.parentId === right.parentId;
    }
    if (left.type === "section" && right.type === "section") {
        return left.id === right.id && (left.placement || "before") === (right.placement || "before");
    }
    if (left.type === "invalidSectionChild" && right.type === "invalidSectionChild") {
        return left.id === right.id && left.reason === right.reason;
    }
    if (left.type === "item" && right.type === "item") {
        return left.id === right.id && (left.placement || "before") === (right.placement || "before");
    }
    return false;
}

type SectionPointerDrag = {
    id: string;
    startX: number;
    startY: number;
    isDragging: boolean;
    pointerId: number;
} | null;

type ItemPointerDrag = {
    id: string;
    sectionId: string;
    startX: number;
    startY: number;
    isDragging: boolean;
    pointerId: number;
} | null;

type PendingDelete =
    | { type: "section"; id: string; name: string; sectionCount: number; itemCount: number }
    | { type: "item"; sectionId: string; id: string; name: string }
    | null;

type PendingValidationMessage = {
    title: string;
    message: string;
} | null;

type ChecklistVersionReviewOutcome = "reject" | "requiresAmendments" | "approve";

type ChecklistVersionCustomApiResponse = {
    Outcome?: string;
    Message?: string;
};

type PendingReviewResponse = {
    outcome: ChecklistVersionReviewOutcome;
    reason: string;
} | null;

type PendingSubmissionResponse = {
    comments: string;
} | null;

type ChecklistVersionSubmissionPayload = {
    submissionComments: string;
};

type ChecklistVersionReviewPayload = {
    outcome: ChecklistVersionReviewOutcome;
    reason: string;
};

type DataverseRecord = Record<string, any>;

type DataverseRetrieveMultipleResult<TRecord extends DataverseRecord = DataverseRecord> = {
    entities?: TRecord[];
    nextLink?: string;
    "@odata.nextLink"?: string;
};

type ChecklistVersionWorkflowState = {
    isVersionActive: boolean;
    isVersionEditable: boolean;
    canShowApprovalHistory: boolean;
    requiresAmendments: boolean;
    reviewerComments: string;
    canShowSubmitForApproval: boolean;
    canSubmitForApproval: boolean;
    canRespondToReview: boolean;
    versionActionLabel: string;
    versionActionDescription: string;
    versionActionDisabledReason: string;
    isVersionActionDisabled: boolean;
};

type KeyboardPane = "sections" | "items";

type SectionKeyboardTarget =
    | { type: "section"; sectionId: string }
    | { type: "addChildSection"; sectionId: string }
    | { type: "addTopLevelSection" };

type ItemKeyboardTarget =
    | { type: "item"; itemId: string }
    | { type: "addItem" };

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        Boolean(target.closest("[role='combobox'],[role='listbox'],[role='group'],[role='option']"))
    );
}

function isInSectionDisclosureZone(
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
    hasChildren: boolean
) {
    if (!hasChildren) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    const isRtl = Boolean(event.currentTarget.closest("[dir='rtl']"));
    const distanceFromDisclosureEdge = isRtl
        ? bounds.right - event.clientX
        : event.clientX - bounds.left;
    return distanceFromDisclosureEdge >= 0 && distanceFromDisclosureEdge <= 36;
}

const TABLE_NAME = "int_checklist";
const VERSION_TABLE_NAME = "int_checklistversion";
const VERSION_HISTORY_TABLE_NAME = "int_checklistversionhistory";
const VERSION_STATE_ACTIVE = 0;
const VERSION_STATE_INACTIVE = 1;
const VERSION_STATUS_DRAFT = 100000000;
const VERSION_STATUS_REQUIRES_AMENDMENTS = 100000005;
const VERSION_STATUS_PENDING_REVIEW = 100000010;
const VERSION_STATUS_PUBLISHED = 100000020;
const VERSION_STATUS_REJECTED = 100000030;
const VERSION_STATUS_CANCELLED = 100000040;
const VERSION_STATUS_SUPERSEDED = 100000050;
const VERSION_STATUS_ARCHIVED = 100000060;
const REVIEW_DECISION_APPROVED = 100000000;
const REVIEW_DECISION_REJECTED = 200000000;
const REVIEW_DECISION_REQUIRES_AMENDMENTS = 300000000;
const HISTORY_EVENT_DRAFT_CREATED = 100000000;
const HISTORY_EVENT_SUBMITTED = 100000010;
const HISTORY_EVENT_PUBLISHED = 100000020;
const HISTORY_EVENT_APPROVED = 100000030;
const HISTORY_EVENT_REJECTED = 100000040;
const HISTORY_EVENT_REQUIRES_AMENDMENTS = 100000050;
const HISTORY_EVENT_SUPERSEDED = 100000060;
const HISTORY_EVENT_ARCHIVED = 100000070;
const SUBMIT_OR_PUBLISH_DRAFT_API_NAME = "int_SubmitOrPublishDraftChecklistVersion";
const APPROVE_CHECKLIST_VERSION_API_NAME = "int_ApproveChecklistVersionForPublishing";
const REQUIRE_CHECKLIST_VERSION_REVIEW_SETTING = "int_RequireChecklistVersionReview";
const CHECKLIST_VERSION_APPROVER_ROLE_NAME = "int_ops_checklistversionapprover";
const STATUS_DRAFT = 1;
const STATUS_PUBLISHED = 2;
const STATUS_INACTIVE = 3;
const STATUS_IN_REVIEW = 4;
const SECTION_NEST_ZONE_RATIO = 0.25;

const langMap: Record<number, { code: string; name: string; isRtl: boolean }> = {
    1033: { code: "en-US", name: "English (United States)", isRtl: false },
};

const translations: Record<string, Record<string, string>> = {
    "en-US": {
        version: "Version",
        loadingChecklist: "Loading checklist version",
        loadFallback: "Dataverse is unavailable. Local checklist data is being used for this session.",
        noChecklistVersionParameter: "No checklist version context was passed to this page.",
        noChecklistVersionHelp: "Paste a checklist version id to load it directly while testing this editor.",
        noChecklistVersionLatestHelp: "Use the most recently modified checklist version for quick testing.",
        enterVersionId: "Enter version id",
        checklistVersionId: "Checklist version id",
        loadVersion: "Load version",
        useMostRecentVersion: "Use most recent",
        noRecentVersionFound: "No checklist versions were found.",
    },
};

const STATUS_LABELS: Record<number, string> = {
    [STATUS_DRAFT]: "Draft",
    [STATUS_PUBLISHED]: "Published",
    [STATUS_INACTIVE]: "Inactive",
    [STATUS_IN_REVIEW]: "In review",
    [VERSION_STATUS_DRAFT]: "Draft",
    [VERSION_STATUS_REQUIRES_AMENDMENTS]: "Requires Amendments",
    [VERSION_STATUS_PENDING_REVIEW]: "Pending Review",
    [VERSION_STATUS_PUBLISHED]: "Published",
    [VERSION_STATUS_REJECTED]: "Rejected",
    [VERSION_STATUS_CANCELLED]: "Cancelled",
    [VERSION_STATUS_SUPERSEDED]: "Superseded",
    [VERSION_STATUS_ARCHIVED]: "Archived",
};

const CHECKLIST_TYPE_STANDARD = 1;
const CHECKLIST_TYPE_STOCK = 2;
const CHECKLIST_TARGET_AIRCRAFT = 1;
const CHECKLIST_TARGET_EQUIPMENT = 2;
const CHECKLIST_TARGET_VEHICLE = 3;
const CHECKLIST_TARGET_BASE_SITE = 4;
const CHECKLIST_TARGET_NO_TARGET = 5;
const VERSION_TYPE_MAJOR = 1;
const VERSION_TYPE_MINOR = 2;

const VERSION_TYPES = [
    { key: VERSION_TYPE_MAJOR, text: "Major" },
    { key: VERSION_TYPE_MINOR, text: "Minor" },
];

const APPLIES_TO_TARGETS: Record<number, AppliesToTargetDefinition> = {
    [CHECKLIST_TARGET_AIRCRAFT]: {
        entityName: "int_aircrafttype",
        idField: "int_aircrafttypeid",
        label: "Aircraft type",
    },
    [CHECKLIST_TARGET_EQUIPMENT]: {
        entityName: "int_equipmenttype",
        idField: "int_equipmenttypeid",
        label: "Equipment type",
        categoryLookup: "int_category",
    },
    [CHECKLIST_TARGET_VEHICLE]: {
        entityName: "int_vehicletype",
        idField: "int_vehicletypeid",
        label: "Vehicle type",
    },
    [CHECKLIST_TARGET_BASE_SITE]: {
        entityName: "int_basesite",
        idField: "int_basesiteid",
        label: "Base site",
    },
};

const ITEM_IDENTIFICATION_TARGET_TYPES = [
    { value: CHECKLIST_TARGET_AIRCRAFT, label: "Aircraft" },
    { value: CHECKLIST_TARGET_EQUIPMENT, label: "Equipment" },
    { value: CHECKLIST_TARGET_VEHICLE, label: "Vehicle" },
    { value: CHECKLIST_TARGET_BASE_SITE, label: "Base Site" },
    { value: CHECKLIST_TARGET_NO_TARGET, label: "No target" },
].filter((target) => target.value !== CHECKLIST_TARGET_NO_TARGET);
const ANY_IDENTIFICATION_TARGET_ID = "00000000-0000-0000-0000-000000000000";
const LEGACY_ANY_IDENTIFICATION_TARGET_ID = "any";

const CHECKLIST_OPTION_DEFINITIONS = [
    {
        key: "defaultQtyExpiredToZero",
        label: "Default expired quantity to zero",
        description: "Sets expired stock item quantities to zero by default during stock checks.",
        type: "boolean",
        defaultValue: false,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STOCK],
    },
    {
        key: "earliestExpiryDateRequired",
        label: "Earliest expiry date required",
        description: "Requires users to capture the earliest expiry date for applicable stock items.",
        type: "boolean",
        defaultValue: false,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STOCK],
    },
    {
        key: "enableNaItemStatusOption",
        label: "Enable N/A item status",
        description: "Allows checklist items to be marked as not applicable when assessment is not required.",
        type: "boolean",
        defaultValue: false,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STANDARD],
    },
    {
        key: "enableSaveForLaterCompletion",
        label: "Enable save for later completion",
        description: "Allows users to save an in-progress checklist and resume completion later.",
        type: "boolean",
        defaultValue: true,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STANDARD, CHECKLIST_TYPE_STOCK],
    },
    {
        key: "minimumParticipantCount",
        label: "Minimum participant count",
        description: "Sets the minimum number of participants required before the checklist can be submitted.",
        type: "number",
        defaultValue: 1,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STANDARD, CHECKLIST_TYPE_STOCK],
    },
    {
        key: "signatureForSubmissionRequired",
        label: "Signature required for submission",
        description: "Requires a signature before users can submit the completed checklist.",
        type: "boolean",
        defaultValue: false,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STANDARD, CHECKLIST_TYPE_STOCK],
    },
    {
        key: "updatedLocationRequired",
        label: "Updated location required",
        description: "Requires users to confirm or update the location while completing the checklist.",
        type: "boolean",
        defaultValue: false,
        appliesToChecklistTypes: [CHECKLIST_TYPE_STANDARD],
    },
] as const;

const useStyles = makeStyles({
    page: {
        width: "100%",
        height: "var(--checklist-editor-height, 100dvh)",
        minHeight: 0,
        maxHeight: "var(--checklist-editor-height, 100dvh)",
        boxSizing: "border-box",
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "@media print": {
            display: "block",
            height: "auto",
            minHeight: "auto",
            maxHeight: "none",
            overflow: "visible",
            backgroundColor: "#fff",
        },
    },
    shell: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexBasis: 0,
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        padding: "14px 18px 16px",
        rowGap: "10px",
        overflow: "hidden",
        "@media print": {
            display: "block",
            height: "auto",
            minHeight: "auto",
            maxHeight: "none",
            padding: 0,
            overflow: "visible",
        },
    },
    compactShell: {
        paddingTop: "4px",
        rowGap: "4px",
    },
    header: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        paddingBottom: "14px",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    },
    titleStack: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        flex: "1 1 auto",
        minWidth: 0,
    },
    eyebrow: {
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        fontWeight: tokens.fontWeightSemibold,
        lineHeight: tokens.lineHeightBase200,
        textTransform: "uppercase",
    },
    pageTitle: {
        margin: 0,
        fontSize: "22px",
        lineHeight: "28px",
        fontWeight: tokens.fontWeightSemibold,
    },
    editableTitleRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        minWidth: 0,
        flexWrap: "wrap",
    },
    pageSubtitle: {
        color: tokens.colorNeutralForeground3,
        fontSize: "12px",
        lineHeight: "18px",
    },
    titleMetadataRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginTop: "2px",
    },
    metadataDivider: {
        color: tokens.colorNeutralForeground4,
        fontSize: "12px",
        lineHeight: "18px",
    },
    empty: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "220px",
        color: tokens.colorNeutralForeground3,
    },
    editorHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "8px 12px",
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
    },
    headerAction: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        justifyContent: "flex-end",
    },
    amendmentMessageBody: {
        display: "flex",
        alignItems: "baseline",
        columnGap: "8px",
        flexWrap: "wrap",
        minWidth: 0,
    },
    amendmentMessageTitle: {
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: "nowrap",
    },
    amendmentMessageComments: {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
    },
    detailsPage: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexBasis: 0,
        height: "100%",
        minHeight: 0,
        rowGap: 0,
        overflow: "hidden",
        "@media print": {
            display: "block",
            height: "auto",
            minHeight: "auto",
            maxHeight: "none",
            overflow: "visible",
        },
    },
    statusPill: {
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "center",
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "4px 10px",
        borderRadius: tokens.borderRadiusCircular,
        fontSize: "13px",
        lineHeight: "20px",
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: "nowrap",
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        backgroundColor: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground2,
    },
    headerStatusPill: {
        alignSelf: "center",
        padding: "2px 9px",
        fontSize: "12px",
        lineHeight: "18px",
    },
    publishButton: {
        backgroundColor: "#107C10",
        color: "#ffffff",
        ":hover": {
            backgroundColor: "#0E700E",
            color: "#ffffff",
        },
        ":active": {
            backgroundColor: "#0C5F0C",
            color: "#ffffff",
        },
        ":disabled": {
            backgroundColor: tokens.colorNeutralBackgroundDisabled,
            color: tokens.colorNeutralForegroundDisabled,
        },
        ":disabled:hover": {
            backgroundColor: tokens.colorNeutralBackgroundDisabled,
            color: tokens.colorNeutralForegroundDisabled,
        },
    },
    rejectButtonIcon: {
        "& svg": {
            color: "#b10e1c",
        },
    },
    requiresAmendmentsButtonIcon: {
        "& svg": {
            color: "#f7630c",
        },
    },
    approvalHistoryEmpty: {
        color: tokens.colorNeutralForeground3,
    },
    timelineList: {
        display: "flex",
        flexDirection: "column",
        gap: "0",
    },
    timelineItem: {
        position: "relative",
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr)",
        gap: "12px",
        padding: "0 0 18px",
        minWidth: 0,
        ":last-child": {
            paddingBottom: 0,
        },
    },
    timelineRail: {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        minHeight: "100%",
        "::after": {
            content: '""',
            position: "absolute",
            top: "-18px",
            bottom: "20px",
            width: "2px",
            backgroundColor: tokens.colorNeutralStroke2,
        },
        "::before": {
            content: '""',
            position: "absolute",
            top: "20px",
            bottom: "-2px",
            width: "2px",
            backgroundColor: tokens.colorNeutralStroke2,
        },
    },
    timelineRailFirst: {
        "::after": {
            display: "none",
        },
    },
    timelineRailLast: {
        "::before": {
            display: "none",
        },
    },
    timelineDot: {
        position: "relative",
        zIndex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        marginTop: "1px",
        borderRadius: tokens.borderRadiusCircular,
        color: "#ffffff",
        backgroundColor: tokens.colorNeutralForeground3,
        ...shorthands.border("2px", "solid", tokens.colorNeutralBackground1),
        boxShadow: `0 0 0 1px ${tokens.colorNeutralStroke1}`,
        "& svg": {
            width: "12px",
            height: "12px",
        },
    },
    timelineDotDraft: {
        backgroundColor: "#605E5C",
        boxShadow: "0 0 0 1px #8A8886",
    },
    timelineDotSubmitted: {
        backgroundColor: "#0078D4",
        boxShadow: "0 0 0 1px #106EBE",
    },
    timelineDotPublished: {
        backgroundColor: "#107C10",
        boxShadow: "0 0 0 1px #0E700E",
    },
    timelineDotApproved: {
        backgroundColor: "#498205",
        boxShadow: "0 0 0 1px #3B6A04",
    },
    timelineDotRejected: {
        backgroundColor: "#C50F1F",
        boxShadow: "0 0 0 1px #A80000",
    },
    timelineDotRequiresAmendments: {
        backgroundColor: "#F7630C",
        boxShadow: "0 0 0 1px #CA5010",
    },
    timelineDotSuperseded: {
        backgroundColor: "#5C2E91",
        boxShadow: "0 0 0 1px #4B2576",
    },
    timelineDotArchived: {
        backgroundColor: "#4A5568",
        boxShadow: "0 0 0 1px #3B4556",
    },
    timelineBody: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
        paddingBottom: "14px",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    },
    timelineBodyLast: {
        borderBottomColor: "transparent",
        paddingBottom: 0,
    },
    timelineTitleRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
    },
    timelineTitle: {
        fontWeight: tokens.fontWeightSemibold,
        overflowWrap: "anywhere",
    },
    timelineRelativeTime: {
        color: tokens.colorNeutralForeground3,
        backgroundColor: tokens.colorNeutralBackground3,
        fontSize: "12px",
        lineHeight: "16px",
        padding: "2px 7px",
        borderRadius: tokens.borderRadiusMedium,
        whiteSpace: "nowrap",
        cursor: "default",
    },
    timelineMeta: {
        color: tokens.colorNeutralForeground3,
        fontSize: "12px",
        lineHeight: "16px",
        overflowWrap: "anywhere",
    },
    timelineText: {
        color: tokens.colorNeutralForeground2,
        lineHeight: "20px",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
    },
    timelineComment: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        marginTop: "4px",
        padding: "8px 10px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        ...shorthands.borderLeft("3px", "solid", tokens.colorBrandBackground),
    },
    timelineCommentLabel: {
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        lineHeight: "14px",
        fontWeight: tokens.fontWeightSemibold,
        textTransform: "uppercase",
    },
    timelineCommentText: {
        color: tokens.colorNeutralForeground1,
        lineHeight: "20px",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
    },
    timelineDetails: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        marginTop: "2px",
    },
    timelineChip: {
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        padding: "2px 8px",
        borderRadius: tokens.borderRadiusCircular,
        color: tokens.colorNeutralForeground2,
        backgroundColor: tokens.colorNeutralBackground2,
        fontSize: "12px",
        lineHeight: "18px",
        overflowWrap: "anywhere",
    },
    versionsSurface: {
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        boxShadow: tokens.shadow2,
    },
    tabSurface: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 0,
        overflow: "hidden",
    },
    tabHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        padding: "0 0 2px",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    },
    tabLabel: {
        ":focus": {
            outlineStyle: "none",
        },
        ":focus-visible": {
            outlineStyle: "none",
        },
    },
    saveActions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
    },
    tabActions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "8px",
        flexWrap: "wrap",
        marginLeft: "auto",
        flexShrink: 0,
    },
    tabPanel: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 0,
        overflow: "hidden",
        padding: "6px 0 0",
        ":focus": {
            outlineStyle: "none",
        },
        ":focus-visible": {
            outlineStyle: "none",
        },
        "@media (max-width: 900px)": {
            overflow: "auto",
        },
    },
    noPrint: {
        "@media print": {
            display: "none !important",
        },
    },
    printContentsDocument: {
        display: "none",
        "@media print": {
            display: "block",
            width: "100%",
            height: "auto",
            minHeight: "auto",
            maxHeight: "none",
            overflow: "visible",
            color: "#111",
            backgroundColor: "#fff",
            fontFamily: "Arial, sans-serif",
            fontSize: "10pt",
            lineHeight: 1.35,
        },
    },
    printHeader: {
        "@media print": {
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
            paddingBottom: "12px",
            marginBottom: "14px",
            borderBottom: "1px solid #bbb",
        },
    },
    printTitle: {
        "@media print": {
            margin: "0 0 5px",
            fontSize: "18pt",
            lineHeight: 1.2,
            fontWeight: 700,
        },
    },
    printSubtitle: {
        "@media print": {
            margin: 0,
            color: "#444",
            fontSize: "9pt",
        },
    },
    printMeta: {
        "@media print": {
            textAlign: "right",
            color: "#444",
            fontSize: "9pt",
            whiteSpace: "nowrap",
        },
    },
    printSection: {
        "@media print": {
            margin: "0 0 12px",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printSectionHeader: {
        "@media print": {
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            padding: "9px 12px",
            border: "1px solid #d6dbe5",
            borderLeft: "4px solid #2563eb",
            borderRadius: "4px",
            backgroundColor: "#eef4ff",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printSectionTitle: {
        "@media print": {
            margin: 0,
            fontSize: "11pt",
            lineHeight: 1.25,
            fontWeight: 700,
        },
    },
    printSectionMeta: {
        "@media print": {
            color: "#4b5563",
            fontSize: "8.5pt",
            whiteSpace: "nowrap",
        },
    },
    printSectionChildren: {
        "@media print": {
            marginTop: "8px",
            paddingLeft: "14px",
            borderLeft: "1px solid #dbeafe",
        },
    },
    printItems: {
        "@media print": {
            display: "flex",
            flexDirection: "column",
            gap: "7px",
            marginTop: "8px",
        },
    },
    printItem: {
        "@media print": {
            display: "flex",
            flexDirection: "column",
            gap: "9px",
            padding: "10px 11px",
            border: "1px solid #e1e5ec",
            borderRadius: "4px",
            backgroundColor: "#fff",
            breakInside: "avoid",
            pageBreakInside: "avoid",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printItemDefinition: {
        "@media print": {
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            minWidth: 0,
        },
    },
    printItemTitle: {
        "@media print": {
            fontWeight: 700,
            color: "#111827",
        },
    },
    printItemDescription: {
        "@media print": {
            marginTop: "2px",
            color: "#374151",
            whiteSpace: "pre-wrap",
        },
    },
    printItemMeta: {
        "@media print": {
            color: "#6b7280",
            fontSize: "8.5pt",
            textAlign: "left",
            whiteSpace: "normal",
        },
    },
    printOutcomePanel: {
        "@media print": {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "100%",
            padding: "9px 10px",
            border: "1px solid #dbeafe",
            borderRadius: "4px",
            backgroundColor: "#f8fbff",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printOutcomeRow: {
        "@media print": {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
        },
    },
    printOutcomeTitle: {
        "@media print": {
            color: "#2563eb",
            fontSize: "7.5pt",
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: "uppercase",
        },
    },
    printCompletionOptions: {
        "@media print": {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "flex-start",
            alignItems: "center",
        },
    },
    printCompletionOption: {
        "@media print": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "5px",
            minWidth: "auto",
            color: "#222",
            fontSize: "8.5pt",
            whiteSpace: "nowrap",
        },
        "::before": {
            content: '""',
            width: "11px",
            height: "11px",
            border: "1px solid #555",
            borderRadius: "2px",
            backgroundColor: "#fff",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printCompletionOptionFail: {
        "@media print": {
            color: "#7f1d1d",
        },
        "::before": {
            borderColor: "#dc2626",
            backgroundColor: "#fee2e2",
        },
    },
    printCompletionOptionWarning: {
        "@media print": {
            color: "#7c2d12",
        },
        "::before": {
            borderColor: "#f97316",
            backgroundColor: "#ffedd5",
        },
    },
    printCompletionOptionPass: {
        "@media print": {
            color: "#14532d",
        },
        "::before": {
            borderColor: "#16a34a",
            backgroundColor: "#dcfce7",
        },
    },
    printCompletionOptionNa: {
        "@media print": {
            color: "#4b5563",
        },
        "::before": {
            borderColor: "#9ca3af",
            backgroundColor: "#f3f4f6",
        },
    },
    printCommentsBox: {
        "@media print": {
            minHeight: "54px",
            padding: "8px 10px",
            color: "#d1d5db",
            fontSize: "8.5pt",
            border: "1px solid #dbe1ea",
            borderRadius: "3px",
            backgroundColor: "#fff",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
        },
    },
    printEmptyState: {
        "@media print": {
            marginTop: "6px",
            color: "#555",
            fontStyle: "italic",
        },
    },
    formStack: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "12px",
        alignItems: "start",
        minHeight: 0,
        overflow: "auto",
        paddingRight: "2px",
    },
    optionsList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        overflow: "auto",
    },
    optionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 0",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    },
    optionLabel: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    optionDescription: {
        color: tokens.colorNeutralForeground3,
        fontSize: "12px",
        lineHeight: "16px",
        maxWidth: "560px",
    },
    optionGroupText: {
        color: tokens.colorNeutralForeground3,
        fontSize: "12px",
    },
    generalSection: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        width: "100%",
        boxSizing: "border-box",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
        boxShadow: tokens.shadow2,
    },
    generalSectionHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        paddingBottom: "10px",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
        "@media (max-width: 600px)": {
            flexDirection: "column",
        },
    },
    generalSectionHeading: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
    },
    generalSectionTitle: {
        fontSize: "16px",
        lineHeight: "22px",
        fontWeight: tokens.fontWeightSemibold,
    },
    generalFormGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "14px 16px",
        alignItems: "start",
        "@media (max-width: 760px)": {
            gridTemplateColumns: "minmax(0, 1fr)",
        },
    },
    generalFieldWide: {
        gridColumn: "1 / -1",
    },
    readOnlyInput: {
        width: "100%",
        color: tokens.colorNeutralForeground1,
        backgroundColor: tokens.colorNeutralBackground2,
    },
    sectionStatusRow: {
        display: "flex",
        alignItems: "center",
        minHeight: "22px",
    },
    controlFullWidth: {
        width: "100%",
    },
    manualVersionPrompt: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "min(100%, 520px)",
    },
    manualVersionForm: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "8px",
        width: "100%",
        alignItems: "end",
    },
    manualVersionActions: {
        display: "flex",
        gap: "8px",
        justifyContent: "center",
        flexWrap: "wrap",
    },
    shortcutToast: {
        position: "fixed",
        top: "18px",
        right: "18px",
        zIndex: 10,
        maxWidth: "360px",
        padding: "10px 12px",
        color: tokens.colorNeutralForeground1,
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
        borderRadius: tokens.borderRadiusMedium,
        boxShadow: tokens.shadow16,
    },
    validationDialogSurface: {
        width: "min(100%, 520px)",
        color: tokens.colorNeutralForeground1,
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusLarge,
        boxShadow: tokens.shadow64,
    },
    validationDialogMessage: {
        color: tokens.colorNeutralForeground2,
        lineHeight: "20px",
    },
    contentsPlaceholder: {
        minHeight: "220px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: tokens.colorNeutralForeground3,
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.border("1px", "dashed", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
    },
    placeholderActions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        flexWrap: "wrap",
    },
    contentsLayout: {
        display: "grid",
        gridTemplateColumns: "minmax(280px, 35%) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        gap: "12px",
        flexGrow: 1,
        flexBasis: 0,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        "@media (max-width: 900px)": {
            gridTemplateColumns: "minmax(0, 1fr)",
            gridTemplateRows: "minmax(260px, 42vh) minmax(320px, 1fr)",
            height: "auto",
            minHeight: 0,
            overflow: "visible",
        },
    },
    contentsColumn: {
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
        "@media (max-width: 900px)": {
            minHeight: "260px",
        },
    },
    activeContentsColumn: {
        ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    },
    shortcutHelpPanel: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "8px",
        marginBottom: "8px",
        color: tokens.colorNeutralForeground2,
    },
    shortcutHelpToggle: {
        alignSelf: "flex-start",
        color: tokens.colorNeutralForeground2,
        fontWeight: tokens.fontWeightSemibold,
        minWidth: "auto",
        padding: "0",
    },
    shortcutHelpContent: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        padding: "8px 10px",
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
    },
    shortcutKey: {
        minWidth: "20px",
        padding: "1px 5px",
        color: tokens.colorNeutralForeground1,
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
        borderRadius: tokens.borderRadiusSmall,
        fontFamily: "monospace",
        fontSize: "12px",
        textAlign: "center",
    },
    shortcutHelpItem: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
    },
    contentsColumnHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "10px 12px",
        ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
        "@media (max-width: 600px)": {
            alignItems: "flex-start",
            flexDirection: "column",
        },
    },
    contentsActions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
        flexWrap: "wrap",
        justifyContent: "flex-end",
    },
    contentsColumnBody: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexGrow: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "10px",
        scrollPaddingBottom: "10px",
    },
    sectionRow: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        width: "100%",
        minHeight: "36px",
        padding: "6px 10px",
        borderRadius: tokens.borderRadiusMedium,
        cursor: "default",
        color: tokens.colorNeutralForeground2,
        userSelect: "none",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        ...shorthands.border("1px", "solid", "transparent"),
    },
    sectionDraggingCursor: {
        cursor: "grabbing",
    },
    sectionRowHoverable: {
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    parentSectionRow: {
        backgroundColor: tokens.colorNeutralBackground2,
        minHeight: "40px",
        padding: "7px 10px",
        fontWeight: tokens.fontWeightSemibold,
    },
    childSectionRow: {
        marginLeft: "0",
        width: "100%",
        minHeight: "34px",
        padding: "5px 10px 5px 8px",
        backgroundColor: "transparent",
    },
    sectionChildren: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "auto",
        marginLeft: "28px",
        boxSizing: "border-box",
        maxHeight: "none",
        opacity: 1,
        overflow: "visible",
        paddingTop: "4px",
        paddingBottom: "4px",
        paddingLeft: "10px",
        borderLeftColor: tokens.colorNeutralStroke2,
        borderLeftWidth: "1px",
        borderLeftStyle: "solid",
    },
    sectionChildrenEndActions: {
        paddingTop: "2px",
    },
    sectionChildrenEndDraft: {
        marginTop: "4px",
    },
    sectionTree: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flexGrow: 0,
        minHeight: 0,
        width: "100%",
    },
    sectionTreeItem: {
        display: "flex",
        flexDirection: "column",
        gap: "0",
        width: "100%",
    },
    sectionTreeItemLayout: {
        width: "100%",
        boxSizing: "border-box",
    },
    visuallyHidden: {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
    },
    childSectionDivider: {
        display: "none",
    },
    sectionAddAnotherRow: {
        display: "flex",
        justifyContent: "flex-start",
        marginLeft: "42px",
        padding: "2px 8px 12px",
    },
    sectionAddTopLevelRow: {
        display: "flex",
        justifyContent: "flex-start",
        padding: "12px 8px 16px 20px",
    },
    itemAddAnotherRow: {
        display: "flex",
        justifyContent: "flex-start",
        padding: "8px 8px 16px",
    },
    sectionAddAnotherButton: {
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
        minWidth: "auto",
        padding: "0",
    },
    sectionMain: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex: 1,
        minWidth: 0,
    },
    sectionTitleCluster: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        minWidth: 0,
        flexWrap: "wrap",
    },
    sectionNameInlineInput: {
        minWidth: "180px",
        width: "100%",
    },
    sectionNameEditRow: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flex: 1,
        minWidth: 0,
    },
    sectionBulkCheckbox: {
        flexShrink: 0,
        whiteSpace: "nowrap",
    },
    sectionNameConfirmButton: {
        minWidth: "28px",
        width: "28px",
        height: "28px",
        flexShrink: 0,
    },
    rowActions: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        flexWrap: "nowrap",
        justifyContent: "flex-end",
        flexShrink: 0,
    },
    sectionCountText: {
        flexShrink: 0,
        padding: "2px 6px",
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        lineHeight: "16px",
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: "nowrap",
    },
    sectionWarningPill: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        flexShrink: 0,
        minWidth: "20px",
        height: "20px",
        padding: "0 6px",
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorPaletteMarigoldBackground2,
        color: tokens.colorPaletteMarigoldForeground2,
        fontSize: "11px",
        lineHeight: "16px",
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: "nowrap",
        "& svg": {
            fontSize: "16px",
        },
    },
    sectionDeleteButton: {
        color: "#b10e1c",
        minWidth: "24px",
        width: "24px",
        height: "24px",
    },
    itemDeleteButton: {
        color: "#b10e1c",
        minWidth: "24px",
        width: "24px",
        height: "24px",
    },
    sectionEditButton: {
        color: tokens.colorNeutralForeground2,
        minWidth: "24px",
        width: "24px",
        height: "24px",
    },
    selectedSectionTitleRow: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        minWidth: 0,
        flexWrap: "wrap",
    },
    selectedSectionRow: {
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorNeutralForeground1,
        borderTopColor: tokens.colorBrandStroke1,
        borderRightColor: tokens.colorBrandStroke1,
        borderBottomColor: tokens.colorBrandStroke1,
        borderLeftColor: tokens.colorBrandStroke1,
        boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`,
    },
    selectedAncestorSectionRow: {
        backgroundColor: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground1,
    },
    selectedChildSectionRow: {
        fontWeight: tokens.fontWeightSemibold,
    },
    keyboardFocusRow: {
        position: "relative",
    },
    keyboardFocusOverlay: {
        position: "absolute",
        inset: "2px",
        borderRadius: tokens.borderRadiusMedium,
        ...shorthands.border("2px", "solid", tokens.colorBrandStroke1),
        boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground1}`,
        pointerEvents: "none",
        zIndex: 5,
    },
    keyboardActionFocus: {
        boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}, 0 0 0 4px ${tokens.colorBrandStroke1}`,
        outlineWidth: "2px",
        outlineStyle: "solid",
        outlineColor: tokens.colorBrandStroke1,
        outlineOffset: "2px",
        borderRadius: tokens.borderRadiusMedium,
        "@media (forced-colors: active)": {
            outlineColor: "Highlight",
        },
    },
    draggingRow: {
        opacity: 0.55,
        pointerEvents: "none",
    },
    dropBeforeRow: {
        borderTopColor: tokens.colorCompoundBrandStroke,
        borderTopWidth: "4px",
        borderTopStyle: "solid",
        boxShadow: `0 -2px 0 ${tokens.colorCompoundBrandStroke}`,
    },
    dropAfterRow: {
        borderBottomColor: tokens.colorCompoundBrandStroke,
        borderBottomWidth: "4px",
        borderBottomStyle: "solid",
        boxShadow: `0 2px 0 ${tokens.colorCompoundBrandStroke}`,
    },
    dropIntoSectionRow: {
        color: tokens.colorBrandForeground1,
    },
    invalidDropSectionRow: {
        color: tokens.colorNeutralForegroundDisabled,
    },
    topLevelEndDropTarget: {
        position: "relative",
        minHeight: "12px",
        marginTop: "1px",
        marginBottom: "1px",
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: "transparent",
        ...shorthands.border("1px", "dashed", "transparent"),
    },
    activeSectionChildrenEndDropTarget: {
        borderTopColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        "::before": {
            content: '""',
            position: "absolute",
            left: "8px",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            height: "2px",
            borderRadius: tokens.borderRadiusCircular,
            backgroundColor: tokens.colorCompoundBrandStroke,
            pointerEvents: "none",
        },
    },
    sectionDropIndicator: {
        position: "absolute",
        pointerEvents: "none",
        zIndex: 6,
    },
    sectionDropIndicatorLine: {
        height: "2px",
        borderRadius: tokens.borderRadiusCircular,
        backgroundColor: tokens.colorCompoundBrandStroke,
    },
    sectionDropIndicatorBox: {
        borderRadius: tokens.borderRadiusMedium,
        ...shorthands.border("2px", "solid", tokens.colorCompoundBrandStroke),
        boxSizing: "border-box",
    },
    sectionDropIndicatorDanger: {
        ...shorthands.border("2px", "solid", tokens.colorNeutralStroke1),
        borderTopColor: tokens.colorNeutralStroke2,
        borderRightColor: tokens.colorNeutralStroke2,
        borderBottomColor: tokens.colorNeutralStroke2,
        borderLeftColor: tokens.colorNeutralStroke2,
    },
    sectionDropIndicatorLabel: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        color: tokens.colorBrandForeground1,
        backgroundColor: tokens.colorNeutralBackground1,
        fontSize: "10px",
        lineHeight: "12px",
        fontWeight: tokens.fontWeightSemibold,
        paddingLeft: "4px",
        paddingRight: "4px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
    },
    sectionDropIndicatorDangerLabel: {
        color: tokens.colorNeutralForegroundDisabled,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    sectionRowText: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    sectionNestTargetText: {
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
    },
    sectionInvalidNestTargetText: {
        color: tokens.colorNeutralForegroundDisabled,
        fontWeight: tokens.fontWeightSemibold,
        textDecorationLine: "line-through",
        textDecorationThickness: "1px",
    },
    sectionBulkPill: {
        flexShrink: 0,
        padding: "2px 6px",
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorPaletteGreenBackground1,
        color: tokens.colorPaletteGreenForeground1,
        fontSize: "11px",
        lineHeight: "16px",
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: "nowrap",
    },
    sectionPathTitle: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        minWidth: 0,
    },
    selectedSectionTitleEditRow: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        minWidth: "160px",
        maxWidth: "420px",
        flex: "1 1 260px",
    },
    selectedSectionTitleInput: {
        minWidth: "120px",
        flex: "1 1 auto",
    },
    sectionPathPart: {
        color: tokens.colorNeutralForeground3,
    },
    sectionPathCurrent: {
        color: tokens.colorNeutralForeground1,
    },
    draftSectionRow: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "8px",
        alignItems: "center",
        padding: "7px 10px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    itemList: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flexGrow: 1,
        minHeight: 0,
    },
    itemRow: {
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "start",
        gap: "10px",
        minHeight: "auto",
        padding: "8px 9px",
        cursor: "grab",
        userSelect: "none",
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusMedium,
        boxSizing: "border-box",
    },
    itemRowReadOnly: {
        cursor: "default",
    },
    selectedItemRow: {
        backgroundColor: tokens.colorBrandBackground2,
    },
    itemReadOnlyText: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
        alignItems: "flex-start",
    },
    itemIdentificationBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        width: "fit-content",
        maxWidth: "100%",
        padding: "2px 6px",
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
        overflow: "hidden",
        whiteSpace: "normal",
        lineHeight: "16px",
    },
    itemIdentificationBadgeIcon: {
        flexShrink: 0,
        fontSize: "14px",
    },
    itemIdentificationBadgeText: {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "normal",
    },
    itemEditCard: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 120px auto",
        gap: "8px",
        alignItems: "end",
        padding: "9px",
        marginBottom: "10px",
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
        borderRadius: tokens.borderRadiusMedium,
    },
    itemNameField: {
        gridColumn: "1 / 2",
    },
    itemDescriptionField: {
        gridColumn: "1 / 3",
    },
    itemQuantityField: {
        gridColumn: "2 / 3",
    },
    itemIdentificationField: {
        gridColumn: "1 / 3",
    },
    itemIdentificationControls: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "8px",
        marginTop: "8px",
        alignItems: "start",
        minWidth: 0,
    },
    identificationGroupOption: {
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
    },
    identificationTargetOption: {
        display: "block",
        paddingLeft: "12px",
        whiteSpace: "normal",
        lineHeight: "18px",
    },
    requiredChecklistRunList: {
        gridColumn: "1 / -1",
        display: "grid",
        gap: "8px",
    },
    requiredChecklistRunRow: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "8px",
        alignItems: "start",
        padding: "8px",
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        borderRadius: tokens.borderRadiusSmall,
    },
    requiredChecklistRunName: {
        minWidth: 0,
    },
    requiredChecklistRunGuidance: {
        gridColumn: "1 / -1",
    },
    itemConfirmButton: {
        gridColumn: "3 / 4",
    },
    itemWorkspace: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flexGrow: 1,
        flexBasis: 0,
        padding: "10px 10px 52px",
        scrollPaddingBottom: "52px",
        minHeight: 0,
        overflow: "auto",
    },
    mutedText: {
        color: tokens.colorNeutralForeground3,
    },
    emptyVersionPlaceholder: {
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: tokens.colorNeutralForeground3,
        padding: "32px",
    },
});

function getUiLanguageId() {
    return (
        (typeof Xrm !== "undefined" &&
            Xrm.Utility?.getGlobalContext()?.userSettings?.languageId) ||
        1033
    );
}

function getLanguageAndRtl() {
    const uiLanguageId = getUiLanguageId();
    const lang = langMap[uiLanguageId]?.code || "en-US";
    const isRtl = langMap[uiLanguageId]?.isRtl ?? false;
    return { language: lang, isRTL: isRtl };
}

function getTranslationFn(language: string) {
    return (key: string): string =>
        translations[language]?.[key] || translations["en-US"]?.[key] || key;
}

function hasDataverse() {
    return typeof Xrm !== "undefined" && !!Xrm.WebApi?.retrieveMultipleRecords;
}

function getNextDataverseQuery(result: DataverseRetrieveMultipleResult) {
    const nextLink = result.nextLink || result["@odata.nextLink"] || "";
    if (!nextLink) return "";
    if (nextLink.startsWith("?")) return nextLink;

    const queryStart = nextLink.indexOf("?");
    return queryStart >= 0 ? nextLink.slice(queryStart) : "";
}

async function retrieveAllDataverseRecords<TRecord extends DataverseRecord = DataverseRecord>(
    entityName: string,
    query: string,
    maxPageSize = 5000
): Promise<TRecord[]> {
    if (!hasDataverse()) return [];

    const records: TRecord[] = [];
    let nextQuery = query;

    while (nextQuery) {
        const result = await Xrm.WebApi.retrieveMultipleRecords(
            entityName,
            nextQuery,
            maxPageSize
        ) as DataverseRetrieveMultipleResult<TRecord>;
        records.push(...(result.entities || []));
        nextQuery = getNextDataverseQuery(result);
    }

    return records;
}

function getCollectionItems(collection: any): any[] {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (Array.isArray(collection._collection)) return collection._collection;
    if (Array.isArray(collection.items)) return collection.items;
    if (typeof collection.forEach === "function") {
        const items: any[] = [];
        collection.forEach((item: any) => items.push(item));
        if (items.length) return items;
    }
    if (typeof collection.getLength === "function" && typeof collection.get === "function") {
        return Array.from({ length: collection.getLength() }, (_, index) => collection.get(index));
    }
    if (typeof collection.get === "function") {
        const items = collection.get();
        return Array.isArray(items) ? items : [];
    }
    if (typeof collection === "object") return Object.values(collection);
    return [];
}

function getOptionLabel(option: any) {
    return (
        option?.Label?.UserLocalizedLabel?.Label ||
        option?.Label?.LocalizedLabels?.[0]?.Label ||
        option?.label?.userLocalizedLabel?.label ||
        option?.label?.localizedLabels?.[0]?.label ||
        option?.label ||
        option?.Label ||
        option?.text ||
        option?.Text ||
        ""
    );
}

function getOptionColor(option: any) {
    const color = option?.Color || option?.color || option?.Metadata?.Color || option?.metadata?.color;
    return typeof color === "string" && color ? color : undefined;
}

function mapStatusOptions(options: any[]): Record<number, StatusOption> {
    return options.reduce((acc, option) => {
        const value = Number(option?.Value ?? option?.value ?? option?.Status ?? option?.status);
        if (!Number.isNaN(value)) {
            acc[value] = {
                text: getOptionLabel(option) || STATUS_LABELS[value] || value.toString(),
                color: getOptionColor(option),
            };
        }
        return acc;
    }, {} as Record<number, StatusOption>);
}

function mergeStatusOptions(primary: Record<number, StatusOption>, fallback: Record<number, StatusOption>) {
    const merged = { ...fallback };
    Object.entries(primary).forEach(([key, option]) => {
        const value = Number(key);
        merged[value] = {
            text: option.text || fallback[value]?.text || STATUS_LABELS[value] || value.toString(),
            color: option.color || fallback[value]?.color,
        };
    });
    return merged;
}

function parseBooleanSetting(value: unknown, fallback = true) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) return true;
        if (["false", "0", "no", "n"].includes(normalized)) return false;
    }
    return fallback;
}

function normalizeRoleName(value: unknown) {
    return String(value || "").trim().toLowerCase();
}

function userHasRole(roleName: string) {
    if (typeof Xrm === "undefined") return false;

    try {
        const roles = Xrm.Utility?.getGlobalContext?.()?.userSettings?.roles;
        const roleItems = (
            typeof roles?.getAll === "function"
                ? roles.getAll()
                : typeof roles?.get === "function"
                  ? roles.get()
                : Array.isArray(roles)
                  ? roles
                  : getCollectionItems(roles)
        ) || [];
        const targetRoleName = normalizeRoleName(roleName);
        return roleItems.some((role: any) => normalizeRoleName(role?.name || role?.Name) === targetRoleName);
    } catch {
        return false;
    }
}

function formatDisplayDateTime(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function parseDateTime(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameCalendarDate(first: Date, second: Date) {
    return (
        first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate()
    );
}

function formatFriendlyDateTime(value?: string, now = new Date()) {
    const date = parseDateTime(value);
    if (!date) return value || "";

    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (elapsedSeconds < 60) return "just now";

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) return elapsedMinutes === 1 ? "1 min ago" : `${elapsedMinutes} mins ago`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return elapsedHours === 1 ? "1 hour ago" : `${elapsedHours} hours ago`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameCalendarDate(date, yesterday)) return "Yesterday";

    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays < 7) return `${elapsedDays} days ago`;

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatFullTimelineDateTime(value?: string) {
    const date = parseDateTime(value);
    if (!date) return value || "";

    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(date);
    const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
    const year = new Intl.DateTimeFormat("en-GB", { year: "numeric" }).format(date);
    const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);

    return `${weekday}, ${day} ${month} ${year}  ${time}`;
}

function getReviewOutcomeLabel(outcome: ChecklistVersionReviewOutcome) {
    if (outcome === "reject") return "Reject";
    if (outcome === "requiresAmendments") return "Requires Amendments";
    return "Approve";
}

function getReviewDecisionDisplayLabel(version: ChecklistVersion) {
    if (version.reviewDecisionLabel) return version.reviewDecisionLabel;
    if (version.reviewDecision === REVIEW_DECISION_APPROVED) return "Approved";
    if (version.reviewDecision === REVIEW_DECISION_REJECTED) return "Rejected";
    if (version.reviewDecision === REVIEW_DECISION_REQUIRES_AMENDMENTS) return "Requires Amendments";
    return "";
}

function getUsableFormattedLabel(value: number | null, formattedLabel = "") {
    const label = String(formattedLabel || "").trim();
    if (!label) return "";
    if (value === null) return label;

    const numericLabel = Number(label.replace(/,/g, ""));
    return Number.isFinite(numericLabel) && numericLabel === value ? "" : label;
}

function getReviewDecisionLabelFromValue(value: number | null, formattedLabel = "") {
    const usableFormattedLabel = getUsableFormattedLabel(value, formattedLabel);
    if (usableFormattedLabel) return usableFormattedLabel;
    if (value === REVIEW_DECISION_APPROVED) return "Approved";
    if (value === REVIEW_DECISION_REJECTED) return "Rejected";
    if (value === REVIEW_DECISION_REQUIRES_AMENDMENTS) return "Requires Amendments";
    return value === null ? "" : String(value);
}

function getHistoryEventTypeLabel(value: number | null, formattedLabel = "") {
    const usableFormattedLabel = getUsableFormattedLabel(value, formattedLabel);
    if (usableFormattedLabel) return usableFormattedLabel;
    if (value === HISTORY_EVENT_DRAFT_CREATED) return "Draft Created";
    if (value === HISTORY_EVENT_SUBMITTED) return "Submitted";
    if (value === HISTORY_EVENT_PUBLISHED) return "Published";
    if (value === HISTORY_EVENT_APPROVED) return "Approved";
    if (value === HISTORY_EVENT_REJECTED) return "Rejected";
    if (value === HISTORY_EVENT_REQUIRES_AMENDMENTS) return "Requires Amendments";
    if (value === HISTORY_EVENT_SUPERSEDED) return "Superseded";
    if (value === HISTORY_EVENT_ARCHIVED) return "Archived";
    return value === null ? "" : String(value);
}

function getChecklistVersionStatusLabel(value: number | null, formattedLabel = "") {
    const usableFormattedLabel = getUsableFormattedLabel(value, formattedLabel);
    if (usableFormattedLabel) return usableFormattedLabel;
    if (value === VERSION_STATUS_DRAFT) return "Draft";
    if (value === VERSION_STATUS_REQUIRES_AMENDMENTS) return "Requires Amendments";
    if (value === VERSION_STATUS_PENDING_REVIEW) return "Pending Review";
    if (value === VERSION_STATUS_PUBLISHED) return "Published";
    if (value === VERSION_STATUS_REJECTED) return "Rejected";
    if (value === VERSION_STATUS_CANCELLED) return "Cancelled";
    if (value === VERSION_STATUS_SUPERSEDED) return "Superseded";
    if (value === VERSION_STATUS_ARCHIVED) return "Archived";
    return value === null ? "" : String(value);
}

function getTimelineEventMarker(entry: ChecklistVersionHistoryEntry, styles: ReturnType<typeof useStyles>) {
    if (entry.eventType === HISTORY_EVENT_DRAFT_CREATED) {
        return { className: styles.timelineDotDraft, Icon: EditRegular };
    }
    if (entry.eventType === HISTORY_EVENT_SUBMITTED) {
        return { className: styles.timelineDotSubmitted, Icon: SendRegular };
    }
    if (entry.eventType === HISTORY_EVENT_PUBLISHED) {
        return { className: styles.timelineDotPublished, Icon: RibbonRegular };
    }
    if (entry.eventType === HISTORY_EVENT_APPROVED) {
        return { className: styles.timelineDotApproved, Icon: CheckmarkRegular };
    }
    if (entry.eventType === HISTORY_EVENT_REJECTED) {
        return { className: styles.timelineDotRejected, Icon: DismissRegular };
    }
    if (entry.eventType === HISTORY_EVENT_REQUIRES_AMENDMENTS) {
        return { className: styles.timelineDotRequiresAmendments, Icon: WarningRegular };
    }
    if (entry.eventType === HISTORY_EVENT_SUPERSEDED) {
        return { className: styles.timelineDotSuperseded, Icon: ChevronRightRegular };
    }
    if (entry.eventType === HISTORY_EVENT_ARCHIVED) {
        return { className: styles.timelineDotArchived, Icon: DeleteRegular };
    }

    return { className: "", Icon: TagRegular };
}

async function loadRequireChecklistVersionReviewSetting(): Promise<boolean> {
    if (typeof Xrm === "undefined") return true;

    try {
        const globalContext = Xrm.Utility?.getGlobalContext?.();
        const value = await globalContext?.getCurrentAppSetting?.(REQUIRE_CHECKLIST_VERSION_REVIEW_SETTING);
        return parseBooleanSetting(value, true);
    } catch {
        return true;
    }
}

function getStatusAttribute(metadata: any) {
    const attributes = metadata?.Attributes || metadata?.attributes;
    const attributeItems = getCollectionItems(attributes);
    return (
        attributeItems.find((attribute) => attribute?.LogicalName === "statuscode" || attribute?.logicalName === "statuscode") ||
        attributes?.getByName?.("statuscode") ||
        attributes?.get?.("statuscode")
    );
}

async function loadStatusOptionsFromMetadataApi(entityName: string): Promise<Record<number, StatusOption>> {
    if (typeof Xrm === "undefined" || typeof fetch === "undefined") return {};

    try {
        const clientUrl = Xrm.Utility?.getGlobalContext?.()?.getClientUrl?.();
        if (!clientUrl) return {};

        const url =
            `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')` +
            "/Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata" +
            "?$select=LogicalName&$expand=OptionSet";
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
            },
        });
        if (!response.ok) return {};

        const metadata = await response.json();
        return mapStatusOptions(getCollectionItems(metadata?.OptionSet?.Options || metadata?.optionSet?.options));
    } catch {
        return {};
    }
}

async function loadStatusOptions(entityName = TABLE_NAME): Promise<Record<number, StatusOption>> {
    if (typeof Xrm === "undefined") return {};

    try {
        const metadata = await Xrm.Utility?.getEntityMetadata?.(entityName, ["statuscode"]);
        const statusAttribute = getStatusAttribute(metadata);
        const options = getCollectionItems(
            statusAttribute?.OptionSet?.Options ||
                statusAttribute?.optionSet?.options ||
                statusAttribute?.OptionSet ||
                statusAttribute?.optionSet ||
                statusAttribute?.Options ||
                statusAttribute?.options
        );
        const clientOptions = mapStatusOptions(options);
        const missingColors = Object.values(clientOptions).some((option) => !option.color);
        if (Object.keys(clientOptions).length === 0 || missingColors) {
            const apiOptions = await loadStatusOptionsFromMetadataApi(entityName);
            return mergeStatusOptions(clientOptions, apiOptions);
        }
        return clientOptions;
    } catch {
        return loadStatusOptionsFromMetadataApi(entityName);
    }
}

function getReadableTextColor(hexColor: string) {
    const hex = hexColor.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return undefined;
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.58 ? "#111827" : "#ffffff";
}

function StatusPill({
    statuscode,
    fallbackLabel,
    statusOptions,
    className,
}: {
    statuscode: number;
    fallbackLabel?: string;
    statusOptions: Record<number, StatusOption>;
    className: string;
}) {
    const option = statusOptions[statuscode];
    const color = option?.color;
    const style = color
        ? {
              backgroundColor: color,
              borderColor: color,
              color: getReadableTextColor(color),
          }
        : undefined;

    return (
        <span className={className} style={style}>
            {option?.text || fallbackLabel || STATUS_LABELS[statuscode] || statuscode}
        </span>
    );
}

function getErrorMessage(error: any) {
    return String(error?.message || error?.error?.message || error?.details || error || "Unknown error");
}

function getReviewDecisionValue(outcome: ChecklistVersionReviewOutcome) {
    if (outcome === "approve") return REVIEW_DECISION_APPROVED;
    if (outcome === "requiresAmendments") return REVIEW_DECISION_REQUIRES_AMENDMENTS;
    return REVIEW_DECISION_REJECTED;
}

function getChecklistVersionWorkflowState({
    version,
    requiresChecklistVersionReview,
    userCanApproveChecklistVersion,
    hasDefinitionChanges,
    hasChecklistSections,
    hasChecklistItems,
    hasEmptySections,
    isWorkflowActionRunning,
}: {
    version: ChecklistVersion;
    requiresChecklistVersionReview: boolean;
    userCanApproveChecklistVersion: boolean;
    hasDefinitionChanges: boolean;
    hasChecklistSections: boolean;
    hasChecklistItems: boolean;
    hasEmptySections: boolean;
    isWorkflowActionRunning: boolean;
}): ChecklistVersionWorkflowState {
    const isVersionActive = version.statecode === VERSION_STATE_ACTIVE;
    const requiresAmendments = version.statuscode === VERSION_STATUS_REQUIRES_AMENDMENTS;
    const isVersionEditable =
        isVersionActive &&
        (version.statuscode === VERSION_STATUS_DRAFT || requiresAmendments);
    const canShowApprovalHistory = version.statuscode !== VERSION_STATUS_DRAFT;
    const canShowSubmitForApproval =
        isVersionEditable &&
        (version.statuscode === VERSION_STATUS_DRAFT || requiresAmendments);
    const canSubmitForApproval =
        canShowSubmitForApproval &&
        !hasDefinitionChanges &&
        hasChecklistSections &&
        hasChecklistItems &&
        !hasEmptySections;
    const canRespondToReview =
        isVersionActive &&
        version.statuscode === VERSION_STATUS_PENDING_REVIEW &&
        userCanApproveChecklistVersion &&
        !hasDefinitionChanges;
    const versionActionLabel = requiresAmendments
        ? requiresChecklistVersionReview
            ? "Resubmit for Approval"
            : "Publish Amendments"
        : requiresChecklistVersionReview
          ? "Submit for Approval"
          : "Publish";
    const versionActionDescription = requiresAmendments
        ? requiresChecklistVersionReview
            ? "This will resubmit the amended checklist version for review."
            : "This will publish the amended checklist version and make it the active version."
        : requiresChecklistVersionReview
          ? "This will submit the checklist version for review. An approver will need to approve it before it can become the active version."
          : "This will publish the checklist version and make it the active version.";
    const versionActionDisabledReason = (() => {
        if (isWorkflowActionRunning) return "This action is already running.";
        if (hasDefinitionChanges) return "Save your changes before submitting or publishing this checklist version.";
        if (!hasChecklistSections) return "Add at least one section before submitting or publishing.";
        if (!hasChecklistItems) return "Add at least one checklist item before submitting or publishing.";
        if (hasEmptySections) return "Remove empty sections or add content to them before submitting or publishing.";
        return "";
    })();

    return {
        isVersionActive,
        isVersionEditable,
        canShowApprovalHistory,
        requiresAmendments,
        reviewerComments: version.reviewReason.trim(),
        canShowSubmitForApproval,
        canSubmitForApproval,
        canRespondToReview,
        versionActionLabel,
        versionActionDescription,
        versionActionDisabledReason,
        isVersionActionDisabled: !canSubmitForApproval || isWorkflowActionRunning,
    };
}

function getPrintableSectionPresentation(section: ChecklistSection, depth: number) {
    return {
        shade: depth === 0 ? "#eef4ff" : depth === 1 ? "#f5f8ff" : "#fbfcff",
        accent: depth === 0 ? "#2563eb" : depth === 1 ? "#60a5fa" : "#93c5fd",
        meta: [
            section.bulkServiceable ? "Bulk check" : "",
            section.sections.length
                ? `${section.sections.length} child section${section.sections.length === 1 ? "" : "s"}`
                : "",
            `${section.items.length} item${section.items.length === 1 ? "" : "s"}`,
        ].filter(Boolean).join(" | "),
    };
}

function getPrintableItemMeta(item: ChecklistItem) {
    const identifyText = item.requestItemIdentification
        ? `Identify equipment${item.identificationTarget ? ` - ${getIdentificationTargetOptionText(item.identificationTarget)}` : ""}`
        : "";
    const checklistRunsText = item.requiresChecklistRuns ? getRequiredChecklistRunsText(item.requiredChecklistRuns) : "";

    return [
        item.quantity !== null && item.quantity !== undefined ? `Quantity ${item.quantity}` : "",
        identifyText,
        checklistRunsText,
    ].filter(Boolean).join(" | ");
}

async function readDataverseResponseMessage(response: any) {
    try {
        const body = typeof response?.json === "function" ? await response.json() : null;
        return String(body?.error?.message || body?.Message || body?.message || "");
    } catch {
        return "";
    }
}

async function executeChecklistVersionCustomApi(
    checklistVersionId: string,
    apiName: string,
    parameters: Record<string, string | number>
): Promise<ChecklistVersionCustomApiResponse> {
    if (typeof Xrm === "undefined") throw new Error("Dataverse is unavailable.");
    const execute = Xrm.WebApi?.online?.execute || Xrm.WebApi?.execute;
    if (typeof execute !== "function") throw new Error("Dataverse Custom API execution is unavailable.");

    const cleanVersionId = normalizeLookupValue(checklistVersionId);
    if (!cleanVersionId) throw new Error("Checklist version id is missing.");

    const parameterTypes: Record<string, { typeName: string; structuralProperty: number }> = {
        entity: {
            typeName: `mscrm.${VERSION_TABLE_NAME}`,
            structuralProperty: 5,
        },
    };
    Object.keys(parameters).forEach((name) => {
        parameterTypes[name] = {
            typeName: typeof parameters[name] === "number" ? "Edm.Int32" : "Edm.String",
            structuralProperty: 1,
        };
    });

    const request = {
        entity: {
            entityType: VERSION_TABLE_NAME,
            id: cleanVersionId,
        },
        ...parameters,
        getMetadata: () => ({
            boundParameter: "entity",
            parameterTypes,
            operationName: apiName,
            operationType: 0,
        }),
    };

    const response = await execute.call(Xrm.WebApi?.online || Xrm.WebApi, request);
    if (response?.ok === false) {
        throw new Error((await readDataverseResponseMessage(response)) || "The Dataverse Custom API call failed.");
    }
    if (!response || response.status === 204 || typeof response.json !== "function") return {};
    return (await response.json().catch(() => ({}))) || {};
}

async function submitOrPublishDraftChecklistVersion(
    checklistVersionId: string,
    payload: ChecklistVersionSubmissionPayload
) {
    const parameters: Record<string, string> = {};
    if (payload.submissionComments) parameters.SubmissionComments = payload.submissionComments;
    return executeChecklistVersionCustomApi(
        checklistVersionId,
        SUBMIT_OR_PUBLISH_DRAFT_API_NAME,
        parameters
    );
}

async function approveChecklistVersionForPublishing(
    checklistVersionId: string,
    payload: ChecklistVersionReviewPayload
) {
    const parameters: Record<string, string | number> = {
        ReviewDecision: getReviewDecisionValue(payload.outcome),
    };
    if (payload.reason) parameters.Reason = payload.reason;
    return executeChecklistVersionCustomApi(
        checklistVersionId,
        APPROVE_CHECKLIST_VERSION_API_NAME,
        parameters
    );
}

function getValue(record: Record<string, any>, names: string[], fallback = "") {
    for (const name of names) {
        if (record[name] !== undefined && record[name] !== null) return record[name];
        const formatted = `${name}@OData.Community.Display.V1.FormattedValue`;
        if (record[formatted] !== undefined && record[formatted] !== null) return record[formatted];
    }
    return fallback;
}

function getDisplayValue(record: Record<string, any>, names: string[], fallback = "") {
    for (const name of names) {
        const formatted = `${name}@OData.Community.Display.V1.FormattedValue`;
        if (record[formatted] !== undefined && record[formatted] !== null) return record[formatted];
        if (record[name] !== undefined && record[name] !== null) return record[name];
    }
    return fallback;
}

function getFormattedValue(record: Record<string, any>, name: string, fallback = "") {
    const formatted = `${name}@OData.Community.Display.V1.FormattedValue`;
    return String(record[formatted] || fallback);
}

function getLookupId(record: Record<string, any>, names: string[]) {
    return String(getValue(record, names, "")).replace(/[{}]/g, "");
}

function makeId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return (crypto as any).randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
}

function parseOptionalQuantity(value: unknown) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSections(sections: any[], parentId: string | null = null): ChecklistSection[] {
    return sections.map((section) => {
        const id = String(section.id || makeId());
        return {
            id,
            name: String(section.name || ""),
            bulkServiceable: Boolean(section.bulkServiceable),
            parentId: section.parentId || parentId,
            sections: normalizeSections(Array.isArray(section.sections) ? section.sections : [], id),
            items: normalizeItems(Array.isArray(section.items) ? section.items : []),
        };
    });
}

function normalizeItems(items: any[]): ChecklistItem[] {
    return items.map((item) => {
        const legacyEquipmentType = item.identificationEquipmentType && typeof item.identificationEquipmentType === "object"
            ? {
                  id: String(item.identificationEquipmentType.id || ""),
                  name: String(item.identificationEquipmentType.name || ""),
                  targetTypeValue: CHECKLIST_TARGET_EQUIPMENT,
                  entityName: "int_equipmenttype",
                  groupId: String(item.identificationEquipmentType.categoryId || ""),
                  groupName: String(item.identificationEquipmentType.categoryName || ""),
              }
            : null;
        const rawIdentificationTargetId =
            item.identificationTarget && typeof item.identificationTarget === "object"
                ? String(item.identificationTarget.id || "")
                : "";
        const rawIdentificationTargetEntityName =
            item.identificationTarget && typeof item.identificationTarget === "object"
                ? String(item.identificationTarget.entityName || "")
                : "";
        const identificationTarget = item.identificationTarget && typeof item.identificationTarget === "object"
            ? {
                  id:
                      rawIdentificationTargetId === LEGACY_ANY_IDENTIFICATION_TARGET_ID ||
                      rawIdentificationTargetEntityName === "any"
                          ? ANY_IDENTIFICATION_TARGET_ID
                          : rawIdentificationTargetId,
                  name: String(item.identificationTarget.name || ""),
                  targetTypeValue: Number(item.identificationTarget.targetTypeValue || item.identificationTargetTypeValue || 0),
                  entityName: rawIdentificationTargetEntityName,
                  groupId: item.identificationTarget.groupId ? String(item.identificationTarget.groupId) : undefined,
                  groupName: item.identificationTarget.groupName ? String(item.identificationTarget.groupName) : undefined,
              }
            : legacyEquipmentType;
        const identificationTargetTypeValue =
            Number(item.identificationTargetTypeValue || identificationTarget?.targetTypeValue || 0) || null;
        const requiredChecklistRuns = (Array.isArray(item.requiredChecklistRuns)
            ? item.requiredChecklistRuns
            : Array.isArray(item.relatedChecklistRuns)
              ? item.relatedChecklistRuns
              : []
        ).map((checklist: any) => ({
            id: String(checklist.id || checklist.checklistId || ""),
            name: String(checklist.name || checklist.checklistName || ""),
            versionSnapshotId: String(checklist.versionSnapshotId || checklist.checklistVersionId || ""),
            versionNumber: checklist.versionNumber ? String(checklist.versionNumber) : undefined,
            required: checklist.required === undefined ? true : Boolean(checklist.required),
            guidance: String(checklist.guidance || checklist.whenToComplete || ""),
        })).filter((checklist: RequiredChecklistRunOption) => checklist.id);
        return {
            id: String(item.id || makeId()),
            name: String(item.name || ""),
            description: String(item.description || ""),
            quantity: parseOptionalQuantity(item.quantity),
            requestItemIdentification: Boolean(item.requestItemIdentification),
            identificationTargetTypeValue,
            identificationTarget,
            requiresChecklistRuns: Boolean(item.requiresChecklistRuns || item.requiresRelatedChecklistRuns),
            requiredChecklistRuns,
        };
    });
}

function createEmptySection(name: string, parentId: string | null): ChecklistSection {
    return {
        id: makeId(),
        name: name.trim(),
        bulkServiceable: false,
        parentId,
        sections: [],
        items: [],
    };
}

function findIdentificationTargetById(
    identificationOptions: IdentificationOptionsByTarget,
    targetTypeValue: number | null,
    targetId: string
): IdentificationTargetOption | null {
    if (!targetTypeValue || !targetId) return null;
    for (const group of identificationOptions[targetTypeValue] || []) {
        const target = group.options.find((item) => item.id === targetId);
        if (target) return target;
    }
    return null;
}

function findIdentificationTargetGroupById(
    identificationOptions: IdentificationOptionsByTarget,
    targetTypeValue: number | null,
    groupId: string
): IdentificationTargetGroup | null {
    if (!targetTypeValue || !groupId) return null;
    return (identificationOptions[targetTypeValue] || []).find((group) => group.id === groupId) || null;
}

function findIdentificationTargetGroupForTargetId(
    identificationOptions: IdentificationOptionsByTarget,
    targetTypeValue: number | null,
    targetId: string
): IdentificationTargetGroup | null {
    if (!targetTypeValue || !targetId) return null;
    return (identificationOptions[targetTypeValue] || []).find((group) =>
        group.options.some((option) => option.id === targetId)
    ) || null;
}

function createChecklistItemFromDraft(
    draftItem: DraftItem,
    identificationOptions: IdentificationOptionsByTarget
): ChecklistItem {
    const selectedTarget = draftItem.identificationTargetId
        ? findIdentificationTargetById(
              identificationOptions,
              CHECKLIST_TARGET_EQUIPMENT,
              draftItem.identificationTargetId
          ) || draftItem.identificationTarget
        : null;
    return {
        id: draftItem.itemId || makeId(),
        name: draftItem.name.trim(),
        description: draftItem.description.trim(),
        quantity: parseOptionalQuantity(draftItem.quantity.trim()),
        requestItemIdentification: draftItem.requestItemIdentification,
        identificationTargetTypeValue: draftItem.requestItemIdentification ? CHECKLIST_TARGET_EQUIPMENT : null,
        identificationTarget: draftItem.requestItemIdentification ? selectedTarget : null,
        requiresChecklistRuns: Boolean(draftItem.requestItemIdentification && draftItem.requiresChecklistRuns),
        requiredChecklistRuns:
            draftItem.requestItemIdentification && draftItem.requiresChecklistRuns
                ? draftItem.requiredChecklistRuns.filter((checklist) => draftItem.requiredChecklistRunIds.includes(checklist.id))
                : [],
    };
}

function flattenSections(sections: ChecklistSection[], depth = 0): FlatChecklistSection[] {
    return sections.flatMap((section) => [
        { section, depth },
        ...flattenSections(section.sections, depth + 1),
    ]);
}

function flattenVisibleSections(sections: ChecklistSection[], collapsedSectionIds: Set<string>, depth = 0): FlatChecklistSection[] {
    return sections.flatMap((section) => [
        { section, depth },
        ...(collapsedSectionIds.has(section.id) ? [] : flattenVisibleSections(section.sections, collapsedSectionIds, depth + 1)),
    ]);
}

function getSectionIdsWithChildren(sections: ChecklistSection[]): string[] {
    return sections.flatMap((section) => [
        ...(section.sections.length ? [section.id] : []),
        ...getSectionIdsWithChildren(section.sections),
    ]);
}

function getOpenSiblingSectionIds(sections: ChecklistSection[], collapsedSectionIds: Set<string>): string[] {
    return sections
        .filter((section) => section.sections.length > 0 && !collapsedSectionIds.has(section.id))
        .map((section) => section.id);
}

function normalizeSectionNameForComparison(name: string) {
    return name.trim().toLocaleLowerCase();
}

function getSiblingSections(sections: ChecklistSection[], parentId: string | null): ChecklistSection[] {
    if (!parentId) return sections;
    return findSectionById(sections, parentId)?.sections || [];
}

function getSectionParentId(sections: ChecklistSection[], sectionId: string): string | null {
    const path = findSectionPathById(sections, sectionId);
    return path.length > 1 ? path[path.length - 2].id : null;
}

function hasDuplicateSectionNameInLevel(
    sections: ChecklistSection[],
    parentId: string | null,
    name: string,
    excludedSectionId = ""
) {
    const normalizedName = normalizeSectionNameForComparison(name);
    if (!normalizedName) return false;
    return getSiblingSections(sections, parentId).some(
        (section) =>
            section.id !== excludedSectionId &&
            normalizeSectionNameForComparison(section.name) === normalizedName
    );
}

function findSectionById(sections: ChecklistSection[], sectionId: string | null): ChecklistSection | null {
    if (!sectionId) return null;
    for (const section of sections) {
        if (section.id === sectionId) return section;
        const childMatch = findSectionById(section.sections, sectionId);
        if (childMatch) return childMatch;
    }
    return null;
}

function findSectionPathById(sections: ChecklistSection[], sectionId: string | null): ChecklistSection[] {
    if (!sectionId) return [];
    for (const section of sections) {
        if (section.id === sectionId) return [section];
        const childPath = findSectionPathById(section.sections, sectionId);
        if (childPath.length) return [section, ...childPath];
    }
    return [];
}

function appendSection(sections: ChecklistSection[], parentId: string | null, section: ChecklistSection): ChecklistSection[] {
    if (!parentId) return [...sections, section];
    return sections.map((candidate) => {
        if (candidate.id === parentId) {
            return {
                ...candidate,
                sections: [...candidate.sections, section],
            };
        }
        return {
            ...candidate,
            sections: appendSection(candidate.sections, parentId, section),
        };
    });
}

function addSection(sections: ChecklistSection[], parentId: string | null, section: ChecklistSection, afterSectionId?: string | null): ChecklistSection[] {
    if (afterSectionId) return insertSectionAfterTarget(sections, section, afterSectionId, parentId);
    return appendSection(sections, parentId, section);
}

function removeSectionById(sections: ChecklistSection[], sectionId: string): { sections: ChecklistSection[]; removed: ChecklistSection | null } {
    let removed: ChecklistSection | null = null;
    const nextSections = sections.reduce<ChecklistSection[]>((acc, section) => {
        if (section.id === sectionId) {
            removed = section;
            return acc;
        }
        const childResult = removeSectionById(section.sections, sectionId);
        if (childResult.removed) removed = childResult.removed;
        acc.push({
            ...section,
            sections: childResult.sections,
        });
        return acc;
    }, []);
    return { sections: nextSections, removed };
}

function updateSectionName(sections: ChecklistSection[], sectionId: string, name: string): ChecklistSection[] {
    return sections.map((section) => {
        if (section.id === sectionId) {
            return {
                ...section,
                name: name.trim(),
            };
        }
        return {
            ...section,
            sections: updateSectionName(section.sections, sectionId, name),
        };
    });
}

function updateSectionBulkServiceable(sections: ChecklistSection[], sectionId: string, bulkServiceable: boolean): ChecklistSection[] {
    return sections.map((section) => {
        if (section.id === sectionId) {
            return {
                ...section,
                bulkServiceable,
            };
        }
        return {
            ...section,
            sections: updateSectionBulkServiceable(section.sections, sectionId, bulkServiceable),
        };
    });
}

function countSectionContents(section: ChecklistSection): { sections: number; items: number } {
    return section.sections.reduce(
        (totals, childSection) => {
            const childTotals = countSectionContents(childSection);
            return {
                sections: totals.sections + 1 + childTotals.sections,
                items: totals.items + childSection.items.length + childTotals.items,
            };
        },
        { sections: 0, items: section.items.length }
    );
}

function addItemToSection(sections: ChecklistSection[], sectionId: string, item: ChecklistItem, afterItemId?: string | null): ChecklistSection[] {
    return sections.map((candidate) => {
        if (candidate.id === sectionId) {
            const targetIndex = afterItemId ? candidate.items.findIndex((candidateItem) => candidateItem.id === afterItemId) : -1;
            const nextItems = [...candidate.items];
            nextItems.splice(targetIndex >= 0 ? targetIndex + 1 : nextItems.length, 0, item);
            return {
                ...candidate,
                items: nextItems,
            };
        }
        return {
            ...candidate,
            sections: addItemToSection(candidate.sections, sectionId, item, afterItemId),
        };
    });
}

function removeItemFromSection(sections: ChecklistSection[], sectionId: string, itemId: string): ChecklistSection[] {
    return sections.map((candidate) => {
        if (candidate.id === sectionId) {
            return {
                ...candidate,
                items: candidate.items.filter((item) => item.id !== itemId),
            };
        }
        return {
            ...candidate,
            sections: removeItemFromSection(candidate.sections, sectionId, itemId),
        };
    });
}

function updateItemInSection(sections: ChecklistSection[], sectionId: string, item: ChecklistItem): ChecklistSection[] {
    return sections.map((candidate) => {
        if (candidate.id === sectionId) {
            return {
                ...candidate,
                items: candidate.items.map((candidateItem) => candidateItem.id === item.id ? item : candidateItem),
            };
        }
        return {
            ...candidate,
            sections: updateItemInSection(candidate.sections, sectionId, item),
        };
    });
}

function reorderByIdWithPlacement<T extends { id: string }>(
    items: T[],
    draggedId: string,
    targetId: string,
    placement: "before" | "after"
) {
    if (draggedId === targetId) return items;
    const draggedIndex = items.findIndex((item) => item.id === draggedId);
    if (draggedIndex < 0) return items;
    const nextItems = [...items];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    const targetIndex = nextItems.findIndex((item) => item.id === targetId);
    if (targetIndex < 0) return items;
    nextItems.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, draggedItem);
    return nextItems;
}

function getAdjacentIdAfterRemoval<T extends { id: string }>(items: T[], removedId: string): string {
    const removedIndex = items.findIndex((item) => item.id === removedId);
    if (removedIndex < 0) return "";
    return items[removedIndex + 1]?.id || items[removedIndex - 1]?.id || "";
}

function getAdjacentIdAfterRemovingIds<T extends { id: string }>(items: T[], removedId: string, removedIds: Set<string>): string {
    const removedIndex = items.findIndex((item) => item.id === removedId);
    if (removedIndex < 0) return "";
    for (let index = removedIndex + 1; index < items.length; index += 1) {
        if (!removedIds.has(items[index].id)) return items[index].id;
    }
    for (let index = removedIndex - 1; index >= 0; index -= 1) {
        if (!removedIds.has(items[index].id)) return items[index].id;
    }
    return "";
}

function getSectionIds(section: ChecklistSection | null): Set<string> {
    if (!section) return new Set();
    return new Set([
        section.id,
        ...section.sections.flatMap((childSection) => Array.from(getSectionIds(childSection))),
    ]);
}

function insertSectionBeforeTarget(sections: ChecklistSection[], section: ChecklistSection, targetId: string, parentId: string | null): ChecklistSection[] {
    const targetIndex = sections.findIndex((candidate) => candidate.id === targetId);
    if (targetIndex >= 0) {
        const nextSections = [...sections];
        nextSections.splice(targetIndex, 0, { ...section, parentId });
        return nextSections;
    }
    return sections.map((candidate) => ({
        ...candidate,
        sections: insertSectionBeforeTarget(candidate.sections, section, targetId, candidate.id),
    }));
}

function insertSectionAfterTarget(sections: ChecklistSection[], section: ChecklistSection, targetId: string, parentId: string | null): ChecklistSection[] {
    const targetIndex = sections.findIndex((candidate) => candidate.id === targetId);
    if (targetIndex >= 0) {
        const nextSections = [...sections];
        nextSections.splice(targetIndex + 1, 0, { ...section, parentId });
        return nextSections;
    }
    return sections.map((candidate) => ({
        ...candidate,
        sections: insertSectionAfterTarget(candidate.sections, section, targetId, candidate.id),
    }));
}

function moveSectionBeforeTarget(sections: ChecklistSection[], draggedId: string, targetId: string): ChecklistSection[] {
    if (draggedId === targetId) return sections;
    const { sections: sectionsWithoutDragged, removed } = removeSectionById(sections, draggedId);
    if (!removed) return sections;
    return insertSectionBeforeTarget(sectionsWithoutDragged, removed, targetId, null);
}

function moveSectionAfterTarget(sections: ChecklistSection[], draggedId: string, targetId: string): ChecklistSection[] {
    if (draggedId === targetId) return sections;
    const { sections: sectionsWithoutDragged, removed } = removeSectionById(sections, draggedId);
    if (!removed) return sections;
    return insertSectionAfterTarget(sectionsWithoutDragged, removed, targetId, null);
}

function appendSectionToParentEnd(sections: ChecklistSection[], section: ChecklistSection, parentId: string): ChecklistSection[] {
    return sections.map((candidate) => {
        if (candidate.id === parentId) {
            return {
                ...candidate,
                sections: [...candidate.sections, { ...section, parentId }],
            };
        }
        return {
            ...candidate,
            sections: appendSectionToParentEnd(candidate.sections, section, parentId),
        };
    });
}

function moveSectionToParentEnd(sections: ChecklistSection[], draggedId: string, parentId: string): ChecklistSection[] {
    if (draggedId === parentId) return sections;
    const { sections: sectionsWithoutDragged, removed } = removeSectionById(sections, draggedId);
    if (!removed) return sections;
    return appendSectionToParentEnd(sectionsWithoutDragged, removed, parentId);
}

function canMoveSectionToChildrenEnd(sections: ChecklistSection[], draggedId: string, parentId: string): boolean {
    if (!draggedId || !parentId || draggedId === parentId) return false;
    const draggedPath = findSectionPathById(sections, draggedId);
    const parentPath = findSectionPathById(sections, parentId);
    if (!draggedPath.length || !parentPath.length) return false;
    if (parentPath.some((section) => section.id === draggedId)) return false;
    const parentSection = parentPath[parentPath.length - 1];
    const draggedSiblingIndex = parentSection.sections.findIndex((section) => section.id === draggedId);
    if (draggedSiblingIndex < 0) return false;
    return draggedSiblingIndex !== parentSection.sections.length - 1;
}

function canDropSectionAtChildrenEnd(sections: ChecklistSection[], draggedId: string, parentId: string): boolean {
    return (
        canMoveSectionToChildrenEnd(sections, draggedId, parentId) ||
        canMoveSectionToParentEnd(sections, draggedId, parentId)
    );
}

function getPreviousSiblingSectionId(sections: ChecklistSection[], sectionId: string): string {
    for (const section of sections) {
        const childIndex = section.sections.findIndex((childSection) => childSection.id === sectionId);
        if (childIndex > 0) return section.sections[childIndex - 1].id;
        const childPreviousSiblingId = getPreviousSiblingSectionId(section.sections, sectionId);
        if (childPreviousSiblingId) return childPreviousSiblingId;
    }
    const topLevelIndex = sections.findIndex((section) => section.id === sectionId);
    return topLevelIndex > 0 ? sections[topLevelIndex - 1].id : "";
}

function getSectionInsertionTargetFromMidpoint(
    sections: ChecklistSection[],
    sectionId: string,
    clientY: number,
    rowBounds: DOMRect
): DragOverTarget {
    if (clientY < rowBounds.top + rowBounds.height / 2) {
        const previousSiblingId = getPreviousSiblingSectionId(sections, sectionId);
        return previousSiblingId
            ? ({ type: "section", id: previousSiblingId, placement: "after" } as DragOverTarget)
            : ({ type: "section", id: sectionId, placement: "before" } as DragOverTarget);
    }
    return { type: "section", id: sectionId, placement: "after" } as DragOverTarget;
}

function canMoveSectionBeforeTarget(sections: ChecklistSection[], draggedId: string, targetId: string): boolean {
    if (!draggedId || !targetId || draggedId === targetId) return false;
    const draggedPath = findSectionPathById(sections, draggedId);
    const targetPath = findSectionPathById(sections, targetId);
    if (!draggedPath.length || !targetPath.length) return false;
    if (targetPath.some((section) => section.id === draggedId)) return false;
    if (draggedPath[draggedPath.length - 1].sections.length > 0 && targetPath.length > 1) return false;
    return targetPath.length <= 2;
}

function canMoveSectionAfterTarget(sections: ChecklistSection[], draggedId: string, targetId: string): boolean {
    return canMoveSectionBeforeTarget(sections, draggedId, targetId);
}

function canMoveSectionToParentEnd(sections: ChecklistSection[], draggedId: string, parentId: string): boolean {
    if (!draggedId || !parentId || draggedId === parentId) return false;
    const draggedPath = findSectionPathById(sections, draggedId);
    const parentPath = findSectionPathById(sections, parentId);
    if (!draggedPath.length || parentPath.length !== 1) return false;
    if (parentPath.some((section) => section.id === draggedId)) return false;
    const draggedSection = draggedPath[draggedPath.length - 1];
    const parentSection = parentPath[parentPath.length - 1];
    return draggedSection.sections.length === 0 && parentSection.items.length === 0;
}

function getSectionParentDropValidationMessage(sections: ChecklistSection[], draggedId: string, parentId: string): string {
    const draggedPath = findSectionPathById(sections, draggedId);
    const parentPath = findSectionPathById(sections, parentId);
    if (!draggedPath.length) return "This section cannot be nested in the selected location.";
    if (parentPath.length !== 1) return "Sections can only be nested beneath top-level sections.";
    const draggedSection = draggedPath[draggedPath.length - 1];
    const parentSection = parentPath[parentPath.length - 1];
    if (parentSection.items.length > 0) {
        return "A section cannot be added beneath a top-level section that already contains checklist items. Remove the items or move them to a child section before nesting another section.";
    }
    if (draggedSection.sections.length > 0) {
        return "A section that already contains child sections cannot be nested beneath another section.";
    }
    return "This section cannot be nested in the selected location.";
}

function reorderSectionItems(
    sections: ChecklistSection[],
    sectionId: string,
    draggedId: string,
    targetId: string,
    placement: "before" | "after"
): ChecklistSection[] {
    return sections.map((candidate) => {
        if (candidate.id === sectionId) {
            return {
                ...candidate,
                items: reorderByIdWithPlacement(candidate.items, draggedId, targetId, placement),
            };
        }
        return {
            ...candidate,
            sections: reorderSectionItems(candidate.sections, sectionId, draggedId, targetId, placement),
        };
    });
}

function inferChecklistTypeValue(value: unknown, label: string) {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && numericValue > 0) return numericValue;
    const normalized = label.toLowerCase();
    if (normalized.includes("stock")) return CHECKLIST_TYPE_STOCK;
    if (normalized.includes("standard")) return CHECKLIST_TYPE_STANDARD;
    return 0;
}

function getChecklistTargetTypeValue(record: Record<string, any>) {
    const value = Number(getValue(record, ["int_checklisttargettype"], 0));
    return Number.isNaN(value) ? 0 : value;
}

function getChecklistTypeLabel(record: Record<string, any>) {
    const label = String(getDisplayValue(record, ["int_type"], ""));
    if (label && Number.isNaN(Number(label))) return label;
    const value = Number(getValue(record, ["int_type"], 0));
    if (value === CHECKLIST_TYPE_STOCK) return "Stock";
    if (value === CHECKLIST_TYPE_STANDARD) return "Standard";
    return "";
}

function getChecklistTargetTypeLabel(record: Record<string, any>) {
    const label = String(getDisplayValue(record, ["int_checklisttargettype"], ""));
    if (label && Number.isNaN(Number(label))) return label;
    const value = getChecklistTargetTypeValue(record);
    if (value === CHECKLIST_TARGET_EQUIPMENT) return "Equipment";
    if (value === CHECKLIST_TARGET_VEHICLE) return "Vehicle";
    if (value === CHECKLIST_TARGET_BASE_SITE) return "Base Site";
    if (value === CHECKLIST_TARGET_AIRCRAFT) return "Aircraft";
    return "";
}

function getApplicableOptionDefinitions(checklistTypeValue: number) {
    return CHECKLIST_OPTION_DEFINITIONS.filter((option) =>
        option.appliesToChecklistTypes.some((type) => type === checklistTypeValue)
    );
}

function normalizeApplicableOptions(options: unknown, checklistTypeValue: number): ChecklistVersionOption[] {
    const optionValues = new Map<string, boolean | number | string>();
    if (Array.isArray(options)) {
        options.forEach((option) => {
            if (option?.key) optionValues.set(String(option.key), option.value);
        });
    }

    return getApplicableOptionDefinitions(checklistTypeValue).map((definition) => ({
        key: definition.key,
        value: optionValues.has(definition.key) ? optionValues.get(definition.key)! : definition.defaultValue,
    }));
}

function getAppliesToOptionId(record: Record<string, any>, idField: string) {
    return String(getValue(record, [idField], "")).replace(/[{}]/g, "");
}

function mapAppliesToRecord(record: Record<string, any>, target: { entityName: string; idField: string; categoryLookup?: string }) {
    const categoryLookup = target.categoryLookup;
    return {
        entityName: target.entityName,
        id: getAppliesToOptionId(record, target.idField),
        name: String(getDisplayValue(record, ["int_name"], "Unnamed")),
        category: categoryLookup
            ? String(getDisplayValue(record, [`_${categoryLookup}_value`], "Uncategorised"))
            : undefined,
    };
}

function getAppliesToOptionText(option: AppliesToOption) {
    return option.category ? `${option.category} / ${option.name}` : option.name;
}

function getIdentificationTargetTypeLabel(targetTypeValue: number | null) {
    return ITEM_IDENTIFICATION_TARGET_TYPES.find((target) => target.value === targetTypeValue)?.label || "";
}

function getIdentificationTargetOptionText(option: IdentificationTargetOption | null) {
    return option ? [option.groupName, option.name].filter(Boolean).join(" / ") : "";
}

function getRequiredChecklistRunsText(checklists: RequiredChecklistRunOption[]) {
    if (!checklists.length) return "";
    const requiredCount = checklists.filter((checklist) => checklist.required ?? true).length;
    const optionalCount = checklists.length - requiredCount;
    if (checklists.length === 1) {
        return `${requiredCount ? "Required" : "Optional"} checklist run: ${checklists[0].name}`;
    }
    return [
        requiredCount ? `${requiredCount} required` : "",
        optionalCount ? `${optionalCount} optional` : "",
    ].filter(Boolean).join(", ") + " checklist runs";
}

function formatVersionNumber(value: unknown) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return "";
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2) : rawValue;
}

async function loadAppliesToOptions(targetTypeValue: number): Promise<AppliesToOption[]> {
    if (typeof Xrm === "undefined") return [];
    const target = APPLIES_TO_TARGETS[targetTypeValue];
    if (!target) return [];

    try {
        const select = `$select=${target.idField},int_name`;
        const records = await retrieveAllDataverseRecords(
            target.entityName,
            `?${select}&$filter=statecode eq 0&$orderby=int_name asc`
        );
        return records
            .map((record) => mapAppliesToRecord(record, target))
            .filter((option: AppliesToOption) => option.id)
            .sort((a: AppliesToOption, b: AppliesToOption) =>
                `${a.category || ""}|${a.name}`.localeCompare(`${b.category || ""}|${b.name}`)
            );
    } catch {
        return [];
    }
}

function sortIdentificationGroups(groups: IdentificationTargetGroup[]) {
    return groups
        .filter((group) => group.options.length > 0)
        .map((group) => ({
            ...group,
            options: [...group.options].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function mapEquipmentTypeRecord(record: Record<string, any>, categoryId: string, categoryName: string): IdentificationTargetOption {
    return {
        id: String(getValue(record, ["int_equipmenttypeid"], "")).replace(/[{}]/g, ""),
        name: String(getValue(record, ["int_name"], "Unnamed equipment type")),
        targetTypeValue: CHECKLIST_TARGET_EQUIPMENT,
        entityName: "int_equipmenttype",
        groupId: categoryId,
        groupName: categoryName,
    };
}

function mapChildTargetRecord(
    record: Record<string, any>,
    targetTypeValue: number,
    entityName: string,
    idField: string,
    fallbackName: string,
    groupId?: string,
    groupName?: string
): IdentificationTargetOption {
    return {
        id: String(getValue(record, [idField], "")).replace(/[{}]/g, ""),
        name: String(getValue(record, ["int_name"], fallbackName)),
        targetTypeValue,
        entityName,
        groupId,
        groupName,
    };
}

async function loadEquipmentIdentificationGroups(): Promise<IdentificationTargetGroup[]> {
    if (typeof Xrm === "undefined") return [];

    try {
        const categories = await retrieveAllDataverseRecords(
            "int_equipmentcategory",
            "?$select=int_equipmentcategoryid,int_name&$filter=statecode eq 0&$orderby=int_name asc&$expand=int_Category_int_equipmenttype($select=int_equipmenttypeid,int_name;$filter=statecode eq 0;$orderby=int_name asc)"
        );
        return sortIdentificationGroups(categories.map((category) => {
            const categoryId = String(getValue(category, ["int_equipmentcategoryid"], "")).replace(/[{}]/g, "");
            const categoryName = String(getValue(category, ["int_name"], "Uncategorised"));
            const options = getCollectionItems(category.int_Category_int_equipmenttype)
                .map((typeRecord) => mapEquipmentTypeRecord(typeRecord, categoryId, categoryName))
                .filter((item) => item.id);
            return { id: categoryId, name: categoryName, options };
        }).filter((category: IdentificationTargetGroup) => category.id));
    } catch {
        try {
            const [categories, types] = await Promise.all([
                retrieveAllDataverseRecords(
                    "int_equipmentcategory",
                    "?$select=int_equipmentcategoryid,int_name&$filter=statecode eq 0&$orderby=int_name asc"
                ),
                retrieveAllDataverseRecords(
                    "int_equipmenttype",
                    "?$select=int_equipmenttypeid,int_name,_int_category_value&$filter=statecode eq 0&$orderby=int_name asc"
                ),
            ]);
            const categoryMap = new Map<string, IdentificationTargetGroup>();
            categories.forEach((category) => {
                const categoryId = String(getValue(category, ["int_equipmentcategoryid"], "")).replace(/[{}]/g, "");
                if (!categoryId) return;
                categoryMap.set(categoryId, {
                    id: categoryId,
                    name: String(getValue(category, ["int_name"], "Uncategorised")),
                    options: [],
                });
            });
            types.forEach((typeRecord) => {
                const categoryId = String(getValue(typeRecord, ["_int_category_value"], "")).replace(/[{}]/g, "");
                const category = categoryMap.get(categoryId);
                if (!category) return;
                const equipmentType = mapEquipmentTypeRecord(typeRecord, category.id, category.name);
                if (equipmentType.id) category.options.push(equipmentType);
            });
            return sortIdentificationGroups(Array.from(categoryMap.values()));
        } catch {
            return [];
        }
    }
}

async function loadFlatIdentificationGroup({
    targetTypeValue,
    entityName,
    idField,
    groupId,
    groupName,
    fallbackName,
}: {
    targetTypeValue: number;
    entityName: string;
    idField: string;
    groupId: string;
    groupName: string;
    fallbackName: string;
}): Promise<IdentificationTargetGroup[]> {
    if (typeof Xrm === "undefined") return [];

    try {
        const records = await retrieveAllDataverseRecords(
            entityName,
            `?$select=${idField},int_name&$filter=statecode eq 0&$orderby=int_name asc`
        );
        const options = records
            .map((record) =>
                mapChildTargetRecord(
                    record,
                    targetTypeValue,
                    entityName,
                    idField,
                    fallbackName
                )
            )
            .filter((item: IdentificationTargetOption) => item.id)
            .sort((a: IdentificationTargetOption, b: IdentificationTargetOption) => a.name.localeCompare(b.name));
        return sortIdentificationGroups([{ id: groupId, name: groupName, options }]);
    } catch {
        return [];
    }
}

async function loadIdentificationOptions(): Promise<IdentificationOptionsByTarget> {
    const equipment = await loadEquipmentIdentificationGroups();

    return {
        [CHECKLIST_TARGET_AIRCRAFT]: [],
        [CHECKLIST_TARGET_EQUIPMENT]: equipment,
        [CHECKLIST_TARGET_VEHICLE]: [],
        [CHECKLIST_TARGET_BASE_SITE]: [],
    };
}

async function loadPublishedChecklistRunOptionsForEquipmentType(
    equipmentTypeId: string,
    currentChecklistId = ""
): Promise<RequiredChecklistRunOption[]> {
    if (!hasDataverse() || !Xrm.WebApi?.retrieveRecord) return [];
    const normalizedEquipmentTypeId = equipmentTypeId.replace(/[{}]/g, "");
    const normalizedCurrentChecklistId = currentChecklistId.replace(/[{}]/g, "").toLowerCase();
    if (!normalizedEquipmentTypeId) return [];

    try {
        const records = await retrieveAllDataverseRecords(
            TABLE_NAME,
            `?$select=int_checklistid,int_name,_int_equipmenttype_value,_int_versionsnapshot_value&$filter=statecode eq 0 and _int_equipmenttype_value eq ${normalizedEquipmentTypeId}&$orderby=int_name asc`
        );
        const candidates = records.filter((record) => {
            const checklistId = getLookupId(record, ["int_checklistid"]).toLowerCase();
            const versionSnapshotId = getLookupId(record, ["_int_versionsnapshot_value"]);
            return checklistId && versionSnapshotId && checklistId !== normalizedCurrentChecklistId;
        });
        const options = await Promise.all(candidates.map(async (record) => {
            const versionSnapshotId = getLookupId(record, ["_int_versionsnapshot_value"]);
            try {
                const versionRecord = await Xrm.WebApi.retrieveRecord(
                    VERSION_TABLE_NAME,
                    versionSnapshotId,
                    "?$select=statuscode,int_versionnumber"
                );
                if (Number(getValue(versionRecord, ["statuscode"], 0)) !== VERSION_STATUS_PUBLISHED) return null;
                const versionNumber = formatVersionNumber(getValue(versionRecord, ["int_versionnumber"], ""));
                return {
                    id: getLookupId(record, ["int_checklistid"]),
                    name: String(getValue(record, ["int_name"], "Unnamed checklist")),
                    versionSnapshotId,
                    versionNumber,
                    required: true,
                    guidance: "",
                } as RequiredChecklistRunOption;
            } catch {
                return null;
            }
        }));
        return options
            .filter((option): option is RequiredChecklistRunOption => Boolean(option?.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

function buildChecklistVersionDefinition({
    checklist,
    checklistName,
    versionType,
    versionNumber,
    description,
    appliesTo,
    options,
    sections,
}: {
    checklist: Checklist;
    checklistName: string;
    versionType: number;
    versionNumber: string;
    description: string;
    appliesTo: AppliesToSelection | null;
    options: ChecklistVersionOption[];
    sections: ChecklistSection[];
}): ChecklistVersionDefinition {
    return {
        checklistVersionDetails: {
            checklistName: checklistName.trim() || checklist.name,
            versionType,
            versionNumber,
            description,
            appliesTo,
            options: normalizeApplicableOptions(options, checklist.checklistTypeValue),
        },
        checklistVersionContents: {
            sections,
        },
    };
}

function serializeChecklistSections(sections: ChecklistSection[]): any[] {
    return sections.map((section) => {
        const serialized: Record<string, any> = {
            id: section.id,
            name: section.name,
        };
        if (section.bulkServiceable) serialized.bulkServiceable = true;
        if (section.sections.length > 0) {
            serialized.sections = serializeChecklistSections(section.sections);
        } else if (section.items.length > 0) {
            serialized.items = section.items.map((item) => {
                const serializedItem: Record<string, any> = {
                    id: item.id,
                    name: item.name,
                };
                if (item.description) serializedItem.description = item.description;
                if (item.quantity !== null && item.quantity !== undefined) serializedItem.quantity = item.quantity;
	                if (item.requestItemIdentification) {
	                    serializedItem.requestItemIdentification = true;
	                    if (item.identificationTargetTypeValue) {
	                        serializedItem.identificationTargetTypeValue = item.identificationTargetTypeValue;
	                    }
	                    if (item.identificationTarget) {
	                        serializedItem.identificationTarget = item.identificationTarget;
	                    }
	                    if (item.requiresChecklistRuns) {
	                        serializedItem.requiresChecklistRuns = true;
	                        if (item.requiredChecklistRuns.length > 0) {
	                            serializedItem.requiredChecklistRuns = item.requiredChecklistRuns;
	                        }
	                    }
	                }
                return serializedItem;
            });
        }
        return serialized;
    });
}

function serializeChecklistVersionDefinition(definition: ChecklistVersionDefinition): any {
    return {
        ...definition,
        checklistVersionContents: {
            sections: serializeChecklistSections(definition.checklistVersionContents.sections),
        },
    };
}

function parseChecklistVersionDefinition(record: Record<string, any>, checklist: Checklist): ChecklistVersionDefinition {
    const rawDefinition = String(getValue(record, ["int_definitionjson"], ""));
    let parsed: any = {};
    if (rawDefinition) {
        try {
            parsed = JSON.parse(rawDefinition);
        } catch {
            parsed = {};
        }
    }

    const details = parsed.checklistVersionDetails || {};
    const contents = parsed.checklistVersionContents || {};
    const checklistName = String(
        getValue(record, ["int_proposedchecklistname"], details.checklistName || details.proposedChecklistName || checklist.name)
    );
    const versionType = Number(getValue(record, ["int_versiontype"], details.versionType || VERSION_TYPE_MINOR));
    const versionNumber = formatVersionNumber(getValue(record, ["int_versionnumber"], details.versionNumber || ""));
    const description = String(getValue(record, ["int_description"], details.description || ""));
    const appliesTo = details.appliesTo && typeof details.appliesTo === "object"
        ? {
              entityName: String(details.appliesTo.entityName || ""),
              id: String(details.appliesTo.id || ""),
              name: String(details.appliesTo.name || ""),
              category: details.appliesTo.category ? String(details.appliesTo.category) : undefined,
          }
        : null;

    return {
        checklistVersionDetails: {
            checklistName,
            versionType,
            versionNumber,
            description,
            appliesTo,
            options: normalizeApplicableOptions(details.options, checklist.checklistTypeValue),
        },
        checklistVersionContents: {
            sections: normalizeSections(Array.isArray(contents.sections) ? contents.sections : checklist.sections),
        },
    };
}

function mapChecklistRecord(record: Record<string, any>): Checklist {
    const checklistType = getChecklistTypeLabel(record);
    const targetType = getChecklistTargetTypeLabel(record);
    return {
        id: String(getValue(record, ["int_checklistid"], "")),
        name: String(getValue(record, ["int_name"], "Unnamed checklist")),
        checklistType,
        checklistTypeValue: inferChecklistTypeValue(getValue(record, ["int_type"], ""), checklistType),
        targetType,
        targetTypeValue: getChecklistTargetTypeValue(record),
        sections: [],
    };
}

async function loadChecklistFromDataverse(checklistId: string): Promise<Checklist | null> {
    if (!checklistId) return null;
    try {
        const record = await Xrm.WebApi.retrieveRecord(
            TABLE_NAME,
            checklistId,
            "?$select=int_checklistid,int_name,int_type,int_checklisttargettype"
        );
        return mapChecklistRecord(record);
    } catch (error) {
        throw new Error(`Parent checklist ${checklistId} retrieve failed: ${getErrorMessage(error)}`);
    }
}

function getMeasuredHostHeight(rootElement: HTMLDivElement | null) {
    const candidates: number[] = [];
    const addCandidate = (value: unknown) => {
        const height = Number(value);
        if (Number.isFinite(height) && height > 120) candidates.push(height);
    };

    addCandidate(window.visualViewport?.height);
    addCandidate(window.innerHeight);
    addCandidate(document.documentElement?.clientHeight);
    addCandidate(document.body?.clientHeight);

    try {
        addCandidate(window.frameElement?.getBoundingClientRect?.().height);
    } catch {
        // Access can be blocked when the page is hosted cross-frame.
    }

    if (rootElement?.parentElement) {
        addCandidate(rootElement.parentElement.getBoundingClientRect().height);
    }

    return candidates.length ? Math.floor(Math.min(...candidates)) : 0;
}

function getExpandedChecklist(record: Record<string, any>, relationshipName: string): Checklist | null {
    const expanded = record[relationshipName];
    return expanded ? mapChecklistRecord(expanded) : null;
}

function getOptionalNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function mapChecklistVersionHistoryRecord(record: Record<string, any>): ChecklistVersionHistoryEntry {
    const eventType = getOptionalNumber(record.int_eventtype);
    const reviewDecision = getOptionalNumber(record.int_reviewdecision);
    const fromStatus = getOptionalNumber(record.int_fromstatus);
    const toStatus = getOptionalNumber(record.int_tostatus);
    const title = String(getValue(record, ["int_title", "int_name"], ""));

    return {
        id: String(getValue(record, ["int_checklistversionhistoryid"], "")),
        eventType,
        eventTypeLabel: getHistoryEventTypeLabel(eventType, getFormattedValue(record, "int_eventtype")),
        eventOn: String(getValue(record, ["int_eventon"], "")),
        eventBy: String(getDisplayValue(record, ["_int_eventby_value"], "")),
        title: title || getHistoryEventTypeLabel(eventType, getFormattedValue(record, "int_eventtype")) || "Checklist version event",
        description: String(getValue(record, ["int_description"], "")),
        comments: String(getValue(record, ["int_comments"], "")),
        reviewDecision,
        reviewDecisionLabel: getReviewDecisionLabelFromValue(reviewDecision, getFormattedValue(record, "int_reviewdecision")),
        fromStatus,
        fromStatusLabel: getChecklistVersionStatusLabel(fromStatus, getFormattedValue(record, "int_fromstatus")),
        toStatus,
        toStatusLabel: getChecklistVersionStatusLabel(toStatus, getFormattedValue(record, "int_tostatus")),
        detailsJson: String(getValue(record, ["int_detailsjson"], "")),
        createdOn: String(getValue(record, ["createdon"], "")),
    };
}

async function loadChecklistVersionHistoryFromDataverse(versionId: string): Promise<ChecklistVersionHistoryEntry[]> {
    if (!versionId || !hasDataverse()) return [];

    try {
        const query = [
            "?$select=int_checklistversionhistoryid,int_name,int_eventtype,int_eventon,_int_eventby_value,int_title,int_description,int_comments,int_reviewdecision,int_fromstatus,int_tostatus,int_detailsjson,createdon",
            `&$filter=_int_checklistversion_value eq ${normalizeLookupValue(versionId)}`,
            "&$orderby=int_eventon desc,createdon desc",
        ].join("");
        const records = await retrieveAllDataverseRecords(VERSION_HISTORY_TABLE_NAME, query);
        return records.map(mapChecklistVersionHistoryRecord);
    } catch (error) {
        console.warn("Checklist version history could not be loaded.", error);
        return [];
    }
}

function getRelationshipNavigationName(relationship: any) {
    return (
        relationship?.ReferencingEntityNavigationPropertyName ||
        relationship?.referencingEntityNavigationPropertyName ||
        relationship?.NavigationPropertyName ||
        relationship?.navigationPropertyName ||
        relationship?.SchemaName ||
        relationship?.schemaName ||
        ""
    );
}

async function loadChecklistNavigationProperty(): Promise<string | null> {
    if (typeof Xrm === "undefined") return null;

    try {
        const metadata = await Xrm.Utility?.getEntityMetadata?.(VERSION_TABLE_NAME, ["int_checklist"]);
        const relationships = getCollectionItems(metadata?.ManyToOneRelationships || metadata?.manyToOneRelationships);
        const relationship = relationships.find((item) => {
            const referencingAttribute = String(item?.ReferencingAttribute || item?.referencingAttribute || "").toLowerCase();
            const referencedEntity = String(item?.ReferencedEntity || item?.referencedEntity || "").toLowerCase();
            return referencingAttribute === "int_checklist" || referencedEntity === TABLE_NAME;
        });
        return relationship ? getRelationshipNavigationName(relationship) || null : null;
    } catch {
        return null;
    }
}

function mapChecklistVersionRecord(record: Record<string, any>, checklist: Checklist): ChecklistVersion {
    return {
        id: String(getValue(record, ["int_checklistversionid"], "")),
        versionNumber: formatVersionNumber(getValue(record, ["int_versionnumber"], "")),
        description: String(getValue(record, ["int_description"], "")),
        versionType: Number(getValue(record, ["int_versiontype"], VERSION_TYPE_MINOR)),
        statecode: Number(getValue(record, ["statecode"], 0)),
        statuscode: Number(getValue(record, ["statuscode"], STATUS_DRAFT)),
        statusLabel: String(getDisplayValue(record, ["statuscode"], "")),
        submittedBy: String(getDisplayValue(record, ["_int_submittedby_value"], "")),
        submittedOn: String(getValue(record, ["int_submittedon"], "")),
        submissionComments: String(getValue(record, ["int_submissioncomments"], "")),
        reviewedBy: String(getDisplayValue(record, ["_int_reviewedby_value"], "")),
        reviewedOn: String(getValue(record, ["int_reviewedon"], "")),
        reviewDecision: record.int_reviewdecision === undefined || record.int_reviewdecision === null
            ? null
            : Number(record.int_reviewdecision),
        reviewDecisionLabel: String(record["int_reviewdecision@OData.Community.Display.V1.FormattedValue"] || ""),
        reviewReason: String(getValue(record, ["int_reviewreason"], "")),
        history: [],
        definition: parseChecklistVersionDefinition(record, checklist),
        checklist,
    };
}

async function withChecklistVersionHistory(version: ChecklistVersion): Promise<ChecklistVersion> {
    if (!version.id) return version;
    return {
        ...version,
        history: await loadChecklistVersionHistoryFromDataverse(version.id),
    };
}

async function loadChecklistVersionFromDataverse(versionId: string): Promise<ChecklistVersion | null> {
    if (!versionId) return null;
    const checklistSelect = "int_checklistid,int_name,int_type,int_checklisttargettype";
    const versionBaseSelect =
        "int_checklistversionid,int_proposedchecklistname,int_versiontype,int_versionnumber,int_description,statecode,statuscode,int_definitionjson";
    const submissionSelect = "_int_submittedby_value,int_submittedon,int_submissioncomments";
    const reviewSelect = "_int_reviewedby_value,int_reviewedon,int_reviewdecision,int_reviewreason";
    const retrieveVersionRecord = async (query: string, fallbackQuery: string) => {
        try {
            return await Xrm.WebApi.retrieveRecord(VERSION_TABLE_NAME, versionId, query);
        } catch {
            return Xrm.WebApi.retrieveRecord(VERSION_TABLE_NAME, versionId, fallbackQuery);
        }
    };
    const relationshipName = (await loadChecklistNavigationProperty()) || "int_checklist";
    let expandError = "";
    if (relationshipName) {
        try {
            const record = await retrieveVersionRecord(
                `?$select=${versionBaseSelect},${submissionSelect},${reviewSelect}&$expand=${relationshipName}($select=${checklistSelect})`,
                `?$select=${versionBaseSelect}&$expand=${relationshipName}($select=${checklistSelect})`
            );
            const checklist = getExpandedChecklist(record, relationshipName);
            if (checklist) return withChecklistVersionHistory(mapChecklistVersionRecord(record, checklist));
        } catch (error) {
            expandError = getErrorMessage(error);
            // Fall back to retrieving the parent checklist through the exact lookup value.
        }
    }

    const record = await retrieveVersionRecord(
        `?$select=${versionBaseSelect},_int_checklist_value,${submissionSelect},${reviewSelect}`,
        `?$select=${versionBaseSelect},_int_checklist_value`
    );
    const checklistId = getLookupId(record, [
        "_int_checklist_value",
    ]);
    if (!checklistId) throw new Error("The checklist version record does not contain an int_checklist lookup value.");
    const checklist = await loadChecklistFromDataverse(checklistId).catch((error) => {
        throw new Error(`${getErrorMessage(error)}${expandError ? ` Expand attempt failed first: ${expandError}` : ""}`);
    });
    return withChecklistVersionHistory(mapChecklistVersionRecord(record, checklist));
}

async function loadLatestChecklistVersionOptionFromDataverse(): Promise<LatestChecklistVersionOption> {
    if (!hasDataverse()) return null;
    const result = await Xrm.WebApi.retrieveMultipleRecords(
        VERSION_TABLE_NAME,
        "?$select=int_checklistversionid,int_versionnumber,int_proposedchecklistname,modifiedon&$orderby=modifiedon desc&$top=1"
    );
    const record = result.entities?.[0];
    if (!record) return null;
    const versionNumber = formatVersionNumber(getValue(record, ["int_versionnumber"], ""));
    const checklistName = String(getValue(record, ["int_proposedchecklistname"], ""));
    const modifiedOn = String(getValue(record, ["modifiedon"], ""));
    const labelParts = [
        checklistName || "Checklist version",
        versionNumber ? `v${versionNumber}` : "",
        modifiedOn ? `modified ${formatDisplayDateTime(modifiedOn)}` : "",
    ].filter(Boolean);
    return {
        id: String(getValue(record, ["int_checklistversionid"], "")),
        label: labelParts.join(" - "),
        modifiedOn,
    };
}

async function saveChecklistVersionDefinition(version: ChecklistVersion, definition: ChecklistVersionDefinition) {
    if (!version.id) return version;
    const serializedDefinition = serializeChecklistVersionDefinition(definition);
    const definitionJson = JSON.stringify(serializedDefinition);
    const details = definition.checklistVersionDetails;
    const versionNumber = Number(details.versionNumber);
    if (Number.isNaN(versionNumber)) throw new Error("Version number must be a valid number.");
    await Xrm.WebApi.updateRecord(VERSION_TABLE_NAME, version.id, {
        int_proposedchecklistname: details.checklistName,
        int_versiontype: details.versionType,
        int_versionnumber: versionNumber,
        int_description: details.description,
        int_definitionjson: definitionJson,
    });
    return {
        ...version,
        versionNumber: formatVersionNumber(details.versionNumber),
        versionType: details.versionType,
        description: details.description,
        definition,
    };
}

function normalizeLookupValue(value: unknown) {
    return String(value || "")
        .trim()
        .replace(/[{}]/g, "")
        .toLowerCase();
}

function parsePageInputData(value: unknown): Record<string, any> {
    if (!value) return {};
    if (typeof value === "object") return value as Record<string, any>;
    if (typeof value !== "string") return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function getUrlPageInput(): GenerativePageInput {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    const data = parsePageInputData(params.get("data"));
    params.forEach((value, key) => {
        if (key.startsWith("data.")) data[key.slice(5)] = value;
    });
    return {
        pageType: params.get("pageType") || undefined,
        pageId: params.get("pageId") || undefined,
        entityName: params.get("entityName") || undefined,
        recordId: params.get("recordId") || undefined,
        data,
    };
}

function getGenerativePageInput(): GenerativePageInput {
    const globalContext = typeof Xrm !== "undefined" ? Xrm.Utility?.getGlobalContext?.() : undefined;
    const pageContextInput = typeof Xrm !== "undefined" ? Xrm.Utility?.getPageContext?.()?.input : undefined;
    const queryParameters = globalContext?.getQueryStringParameters?.() || {};
    const urlInput = getUrlPageInput();
    const inputData = parsePageInputData(pageContextInput?.data ?? queryParameters.data ?? urlInput.data);

    return {
        ...urlInput,
        ...queryParameters,
        ...pageContextInput,
        entityName: pageContextInput?.entityName || queryParameters.entityName || urlInput.entityName,
        recordId: pageContextInput?.recordId || queryParameters.recordId || urlInput.recordId,
        data: {
            ...(urlInput.data || {}),
            ...parsePageInputData(queryParameters.data),
            ...inputData,
        },
    };
}

const GeneratedComponent = () => {
    const styles = useStyles();
    const { language, isRTL } = useMemo(getLanguageAndRtl, []);
    const t = useMemo(() => getTranslationFn(language), [language]);

    const [selectedVersion, setSelectedVersion] = useState<ChecklistVersion | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [statusOptions, setStatusOptions] = useState<Record<number, StatusOption>>({});
    const [pageInput] = useState<GenerativePageInput>(() => getGenerativePageInput());
    const [manualVersionId, setManualVersionId] = useState("");
    const [showManualVersionInput, setShowManualVersionInput] = useState(false);
    const [isManualVersionLoading, setIsManualVersionLoading] = useState(false);
    const [latestVersionOption, setLatestVersionOption] = useState<LatestChecklistVersionOption>(null);
    const [isLatestVersionLoading, setIsLatestVersionLoading] = useState(false);
    const pageRef = useRef<HTMLDivElement>(null);
    const [availablePageHeight, setAvailablePageHeight] = useState(0);
    const pageChecklistVersionId = useMemo(
        () =>
            normalizeLookupValue(
                pageInput.data?.checklistVersionId ||
                    pageInput.data?.int_checklistversionid ||
                    pageInput.recordId
            ),
        [pageInput]
    );

    useEffect(() => {
        const updateAvailableHeight = () => {
            const measuredHeight = getMeasuredHostHeight(pageRef.current);
            if (measuredHeight) setAvailablePageHeight(measuredHeight);
        };
        updateAvailableHeight();

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => {
                      window.requestAnimationFrame(updateAvailableHeight);
                  })
                : null;

        if (resizeObserver) {
            if (pageRef.current?.parentElement) resizeObserver.observe(pageRef.current.parentElement);
            resizeObserver.observe(document.documentElement);
            if (document.body) resizeObserver.observe(document.body);
        }

        window.addEventListener("resize", updateAvailableHeight);
        window.visualViewport?.addEventListener("resize", updateAvailableHeight);
        window.visualViewport?.addEventListener("scroll", updateAvailableHeight);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener("resize", updateAvailableHeight);
            window.visualViewport?.removeEventListener("resize", updateAvailableHeight);
            window.visualViewport?.removeEventListener("scroll", updateAvailableHeight);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function load() {
            setIsLoading(true);
            try {
                if (hasDataverse()) {
                    if (!pageChecklistVersionId) {
                        const latestOption = await loadLatestChecklistVersionOptionFromDataverse();
                        if (isMounted) {
                            setMessage("");
                            setLatestVersionOption(latestOption);
                            setSelectedVersion(null);
                        }
                        return;
                    }
                    if (isMounted) setLatestVersionOption(null);
                    const [version, statusMetadata] = await Promise.all([
                        loadChecklistVersionFromDataverse(pageChecklistVersionId),
                        loadStatusOptions(VERSION_TABLE_NAME),
                    ]);
                    if (isMounted) {
                        setSelectedVersion(version);
                        setStatusOptions(statusMetadata);
                    }
                } else if (isMounted) {
                    setMessage(t("loadFallback"));
                    setSelectedVersion(null);
                }
            } catch (error) {
                if (isMounted) {
                    setMessage(error instanceof Error ? error.message : t("loadFallback"));
                    setSelectedVersion(null);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        load();
        return () => {
            isMounted = false;
        };
    }, [pageChecklistVersionId, t]);

    const loadVersionById = async (versionId: string) => {
        const normalizedVersionId = normalizeLookupValue(versionId);
        if (!normalizedVersionId) return;
        setMessage("");
        try {
            if (!hasDataverse()) {
                setMessage(t("loadFallback"));
                setSelectedVersion(null);
                return;
            }

            const [version, statusMetadata] = await Promise.all([
                loadChecklistVersionFromDataverse(normalizedVersionId),
                loadStatusOptions(VERSION_TABLE_NAME),
            ]);
            setSelectedVersion(version);
            setStatusOptions(statusMetadata);
            setShowManualVersionInput(false);
        } catch (error) {
            setSelectedVersion(null);
            setMessage(error instanceof Error ? error.message : t("loadFallback"));
        }
    };
    const loadManualVersion = async () => {
        if (!normalizeLookupValue(manualVersionId) || isManualVersionLoading) return;
        setIsManualVersionLoading(true);
        try {
            await loadVersionById(manualVersionId);
        } finally {
            setIsManualVersionLoading(false);
        }
    };
    const loadLatestVersion = async () => {
        if (!latestVersionOption?.id || isLatestVersionLoading) return;
        setIsLatestVersionLoading(true);
        try {
            await loadVersionById(latestVersionOption.id);
        } finally {
            setIsLatestVersionLoading(false);
        }
    };

    return (
        <div
            ref={pageRef}
            dir={isRTL ? "rtl" : "ltr"}
            className={styles.page}
            style={
                availablePageHeight
                    ? ({ "--checklist-editor-height": `${availablePageHeight}px` } as React.CSSProperties)
                    : undefined
            }
        >
            <div className={[styles.shell, pageChecklistVersionId ? styles.compactShell : ""].filter(Boolean).join(" ")}>
                {message && (
                    <MessageBar intent="warning">
                        <MessageBarBody>{message}</MessageBarBody>
                    </MessageBar>
                )}
                {isLoading ? (
                    <FocusedChecklistLoading t={t} />
                ) : selectedVersion ? (
                    <ChecklistDetails
                        version={selectedVersion}
                        statusOptions={statusOptions}
                        onVersionSaved={setSelectedVersion}
                        useCompactVersionHeader={Boolean(pageChecklistVersionId)}
                        t={t}
                    />
                ) : (
                    <FocusedChecklistEmpty
                        t={t}
                        manualVersionId={manualVersionId}
                        showManualVersionInput={showManualVersionInput}
                        isManualVersionLoading={isManualVersionLoading}
                        latestVersionOption={latestVersionOption}
                        isLatestVersionLoading={isLatestVersionLoading}
                        onManualVersionIdChange={setManualVersionId}
                        onShowManualVersionInput={() => setShowManualVersionInput(true)}
                        onLoadManualVersion={loadManualVersion}
                        onLoadLatestVersion={loadLatestVersion}
                    />
                )}
            </div>
        </div>
    );
};

function FocusedChecklistLoading({ t }: { t: (key: string) => string }) {
    const styles = useStyles();
    return (
        <div className={styles.detailsPage}>
            <div className={styles.header}>
                <div className={styles.titleStack}>
                    <Text className={styles.eyebrow}>{t("loadingChecklist")}</Text>
                    <Text as="h1" className={styles.pageTitle}>
                        {t("loadingChecklist")}
                    </Text>
                </div>
            </div>
            <div className={styles.versionsSurface}>
                <div className={styles.empty}>
                    <Spinner label={t("loadingChecklist")} />
                </div>
            </div>
        </div>
    );
}

function FocusedChecklistEmpty({
    t,
    manualVersionId,
    showManualVersionInput,
    isManualVersionLoading,
    latestVersionOption,
    isLatestVersionLoading,
    onManualVersionIdChange,
    onShowManualVersionInput,
    onLoadManualVersion,
    onLoadLatestVersion,
}: {
    t: (key: string) => string;
    manualVersionId: string;
    showManualVersionInput: boolean;
    isManualVersionLoading: boolean;
    latestVersionOption: LatestChecklistVersionOption;
    isLatestVersionLoading: boolean;
    onManualVersionIdChange: (value: string) => void;
    onShowManualVersionInput: () => void;
    onLoadManualVersion: () => void;
    onLoadLatestVersion: () => void;
}) {
    const styles = useStyles();
    const canLoadManualVersion = Boolean(normalizeLookupValue(manualVersionId));

    return (
        <div className={styles.detailsPage}>
            <div className={styles.versionsSurface}>
                <div className={styles.emptyVersionPlaceholder}>
                    <div className={styles.manualVersionPrompt}>
                        <Text block weight="semibold">{t("noChecklistVersionParameter")}</Text>
                        <Caption1 className={styles.mutedText}>{t("noChecklistVersionHelp")}</Caption1>
                        <Caption1 className={styles.mutedText}>{t("noChecklistVersionLatestHelp")}</Caption1>
                        <Caption1 className={styles.mutedText}>
                            {latestVersionOption ? latestVersionOption.label : t("noRecentVersionFound")}
                        </Caption1>
                        {showManualVersionInput ? (
                            <div className={styles.manualVersionForm}>
                                <Field label={t("checklistVersionId")}>
                                    <Input
                                        value={manualVersionId}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        onChange={(_, data) => onManualVersionIdChange(data.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" && canLoadManualVersion) onLoadManualVersion();
                                        }}
                                    />
                                </Field>
                                <Button
                                    appearance="primary"
                                    disabled={!canLoadManualVersion || isManualVersionLoading}
                                    onClick={onLoadManualVersion}
                                >
                                    {isManualVersionLoading ? t("loadingChecklist") : t("loadVersion")}
                                </Button>
                            </div>
                        ) : (
                            <div className={styles.manualVersionActions}>
                                <Button
                                    appearance="primary"
                                    disabled={!latestVersionOption?.id || isLatestVersionLoading}
                                    onClick={onLoadLatestVersion}
                                >
                                    {isLatestVersionLoading ? t("loadingChecklist") : t("useMostRecentVersion")}
                                </Button>
                                <Button
                                    appearance="subtle"
                                    className={styles.sectionAddAnotherButton}
                                    onClick={onShowManualVersionInput}
                                >
                                    {t("enterVersionId")}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function useChecklistReferenceData(targetTypeValue: number) {
    const [appliesToOptions, setAppliesToOptions] = useState<AppliesToOption[]>([]);
    const [identificationOptions, setIdentificationOptions] = useState<IdentificationOptionsByTarget>(
        {} as IdentificationOptionsByTarget
    );
    const [requiresChecklistVersionReview, setRequiresChecklistVersionReview] = useState(true);
    const [userCanApproveChecklistVersion, setUserCanApproveChecklistVersion] = useState(false);

    useEffect(() => {
        let isMounted = true;
        loadAppliesToOptions(targetTypeValue).then((items) => {
            if (isMounted) setAppliesToOptions(items);
        });
        return () => {
            isMounted = false;
        };
    }, [targetTypeValue]);

    useEffect(() => {
        let isMounted = true;
        loadIdentificationOptions().then((items) => {
            if (isMounted) setIdentificationOptions(items);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        loadRequireChecklistVersionReviewSetting().then((value) => {
            if (isMounted) setRequiresChecklistVersionReview(value);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        setUserCanApproveChecklistVersion(userHasRole(CHECKLIST_VERSION_APPROVER_ROLE_NAME));
    }, []);

    return {
        appliesToOptions,
        identificationOptions,
        requiresChecklistVersionReview,
        userCanApproveChecklistVersion,
    };
}

function useShortcutNotice() {
    const [shortcutNotice, setShortcutNotice] = useState("");
    const shortcutNoticeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (shortcutNoticeTimerRef.current) window.clearTimeout(shortcutNoticeTimerRef.current);
        };
    }, []);

    const showShortcutNotice = (message: string) => {
        setShortcutNotice(message);
        if (shortcutNoticeTimerRef.current) window.clearTimeout(shortcutNoticeTimerRef.current);
        shortcutNoticeTimerRef.current = window.setTimeout(() => {
            setShortcutNotice("");
            shortcutNoticeTimerRef.current = null;
        }, 2200);
    };

    return { shortcutNotice, showShortcutNotice };
}

function useUnsavedChangesWarning(hasDefinitionChanges: boolean, isSaving: boolean) {
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasDefinitionChanges || isSaving) return;
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasDefinitionChanges, isSaving]);
}

function useSectionDropIndicator(
    dragOverTarget: DragOverTarget,
    sectionTreeBodyRef: React.RefObject<HTMLDivElement>
) {
    const [sectionDropIndicator, setSectionDropIndicator] = useState<SectionDropIndicator>(null);

    useEffect(() => {
        const activeDragOverTarget = dragOverTarget;
        if (
            activeDragOverTarget?.type !== "section" &&
            activeDragOverTarget?.type !== "invalidSectionChild"
        ) {
            setSectionDropIndicator(null);
            return;
        }

        let animationFrameId = 0;
        const updateSectionDropIndicator = () => {
            const body = sectionTreeBodyRef.current;
            if (!body) {
                setSectionDropIndicator(null);
                return;
            }
            const isSectionTarget = activeDragOverTarget.type === "section";
            const isInvalidNestTarget = activeDragOverTarget.type === "invalidSectionChild";
            if (!isSectionTarget && !isInvalidNestTarget) {
                setSectionDropIndicator(null);
                return;
            }
            const targetSectionId = activeDragOverTarget.id;
            const row = Array.from(body.querySelectorAll<HTMLElement>("[data-section-id]")).find(
                (element) => element.dataset.sectionId === targetSectionId
            );
            if (!row) {
                setSectionDropIndicator(null);
                return;
            }

            const bodyBounds = body.getBoundingClientRect();
            const rowBounds = row.getBoundingClientRect();
            const rowTop = rowBounds.top - bodyBounds.top + body.scrollTop;
            const rowLeft = rowBounds.left - bodyBounds.left + body.scrollLeft;
            const placement = isInvalidNestTarget ? "child" : activeDragOverTarget.placement || "before";

            if (placement === "child") {
                setSectionDropIndicator({
                    kind: "box",
                    top: rowTop + 3,
                    left: rowLeft + 4,
                    width: Math.max(24, rowBounds.width - 8),
                    height: Math.max(24, rowBounds.height - 6),
                    label: isInvalidNestTarget ? "Not permitted here" : "Insert as child",
                    tone: isInvalidNestTarget ? "danger" : "brand",
                });
                return;
            }

            setSectionDropIndicator({
                kind: "line",
                top: rowTop + (placement === "after" ? rowBounds.height - 1 : -1),
                left: rowLeft + 8,
                width: Math.max(24, rowBounds.width - 16),
                height: 2,
                label: "Insert here",
                tone: "brand",
            });
        };

        animationFrameId = window.requestAnimationFrame(updateSectionDropIndicator);
        const body = sectionTreeBodyRef.current;
        body?.addEventListener("scroll", updateSectionDropIndicator);
        window.addEventListener("resize", updateSectionDropIndicator);
        return () => {
            if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
            body?.removeEventListener("scroll", updateSectionDropIndicator);
            window.removeEventListener("resize", updateSectionDropIndicator);
        };
    }, [dragOverTarget, sectionTreeBodyRef]);

    return sectionDropIndicator;
}

function ReviewActionButtons({
    disabled,
    styles,
    onReviewResponse,
}: {
    disabled: boolean;
    styles: ReturnType<typeof useStyles>;
    onReviewResponse: (outcome: ChecklistVersionReviewOutcome) => void;
}) {
    return (
        <>
            <Button
                appearance="secondary"
                className={styles.rejectButtonIcon}
                icon={<DismissRegular />}
                disabled={disabled}
                onClick={() => onReviewResponse("reject")}
            >
                Reject
            </Button>
            <Button
                appearance="secondary"
                className={styles.requiresAmendmentsButtonIcon}
                icon={<WarningRegular />}
                disabled={disabled}
                onClick={() => onReviewResponse("requiresAmendments")}
            >
                Requires Amendments
            </Button>
            <Button
                appearance="primary"
                icon={<CheckmarkRegular />}
                disabled={disabled}
                onClick={() => onReviewResponse("approve")}
            >
                Approve
            </Button>
        </>
    );
}

function ChecklistVersionActionGroup({
    canRespondToReview,
    isWorkflowActionRunning,
    canShowSubmitForApproval,
    submitActionButton,
    styles,
    onReviewResponse,
}: {
    canRespondToReview: boolean;
    isWorkflowActionRunning: boolean;
    canShowSubmitForApproval: boolean;
    submitActionButton: React.ReactNode;
    styles: ReturnType<typeof useStyles>;
    onReviewResponse: (outcome: ChecklistVersionReviewOutcome) => void;
}) {
    return (
        <>
            {canRespondToReview && (
                <ReviewActionButtons
                    disabled={isWorkflowActionRunning}
                    styles={styles}
                    onReviewResponse={onReviewResponse}
                />
            )}
            {canShowSubmitForApproval && submitActionButton}
        </>
    );
}

function GeneralTab({
    styles,
    useCompactVersionHeader,
    version,
    statusOptions,
    checklistName,
    versionType,
    versionNumber,
    description,
    appliesTo,
    appliesToTarget,
    appliesToOptions,
    isVersionEditable,
    setChecklistName,
    setVersionType,
    setVersionNumber,
    setDescription,
    setAppliesTo,
    markDefinitionChanged,
}: {
    styles: ReturnType<typeof useStyles>;
    useCompactVersionHeader?: boolean;
    version: ChecklistVersion;
    statusOptions: Record<number, StatusOption>;
    checklistName: string;
    versionType: number;
    versionNumber: string;
    description: string;
    appliesTo: AppliesToSelection | null;
    appliesToTarget?: AppliesToTargetDefinition;
    appliesToOptions: AppliesToOption[];
    isVersionEditable: boolean;
    setChecklistName: React.Dispatch<React.SetStateAction<string>>;
    setVersionType: React.Dispatch<React.SetStateAction<number>>;
    setVersionNumber: React.Dispatch<React.SetStateAction<string>>;
    setDescription: React.Dispatch<React.SetStateAction<string>>;
    setAppliesTo: React.Dispatch<React.SetStateAction<AppliesToSelection | null>>;
    markDefinitionChanged: () => void;
}) {
    return (
        <div className={styles.tabPanel}>
            <div className={styles.formStack}>
                <section className={styles.generalSection}>
                    <div className={styles.generalSectionHeader}>
                        <div className={styles.generalSectionHeading}>
                            <Text className={styles.generalSectionTitle}>Version</Text>
                        </div>
                        {useCompactVersionHeader && (
                            <div className={styles.sectionStatusRow}>
                                <StatusPill
                                    statuscode={version.statuscode}
                                    fallbackLabel={version.statusLabel}
                                    statusOptions={statusOptions}
                                    className={`${styles.statusPill} ${styles.headerStatusPill}`}
                                />
                            </div>
                        )}
                    </div>
                    <div className={styles.generalFormGrid}>
                        <Field label="Checklist name" className={styles.generalFieldWide}>
                            <Input
                                className={styles.controlFullWidth}
                                value={checklistName}
                                disabled={!isVersionEditable}
                                onChange={(_, data) => {
                                    if (!isVersionEditable) return;
                                    setChecklistName(data.value);
                                    markDefinitionChanged();
                                }}
                            />
                        </Field>
                        <Field label="Version type">
                            <Dropdown
                                className={styles.controlFullWidth}
                                selectedOptions={[String(versionType)]}
                                value={VERSION_TYPES.find((item) => item.key === versionType)?.text || ""}
                                disabled={!isVersionEditable}
                                onOptionSelect={(_, data) => {
                                    if (!isVersionEditable) return;
                                    setVersionType(Number(data.optionValue) || VERSION_TYPE_MINOR);
                                    markDefinitionChanged();
                                }}
                            >
                                {VERSION_TYPES.map((item) => (
                                    <Option key={item.key} value={String(item.key)}>
                                        {item.text}
                                    </Option>
                                ))}
                            </Dropdown>
                        </Field>
                        <Field label="Version number">
                            <Input
                                className={styles.controlFullWidth}
                                type="number"
                                step="0.01"
                                value={versionNumber}
                                disabled={!isVersionEditable}
                                onChange={(_, data) => {
                                    if (!isVersionEditable) return;
                                    setVersionNumber(data.value);
                                    markDefinitionChanged();
                                }}
                                onBlur={() => {
                                    if (isVersionEditable) setVersionNumber((current) => formatVersionNumber(current));
                                }}
                            />
                        </Field>
                        <Field label="Description" className={styles.generalFieldWide}>
                            <Textarea
                                className={styles.controlFullWidth}
                                resize="vertical"
                                rows={5}
                                value={description}
                                disabled={!isVersionEditable}
                                onChange={(_, data) => {
                                    if (!isVersionEditable) return;
                                    setDescription(data.value);
                                    markDefinitionChanged();
                                }}
                            />
                        </Field>
                    </div>
                </section>
                <section className={styles.generalSection}>
                    <div className={styles.generalSectionHeader}>
                        <div className={styles.generalSectionHeading}>
                            <Text className={styles.generalSectionTitle}>Application</Text>
                        </div>
                    </div>
                    <div className={styles.generalFormGrid}>
                        <Field label={appliesToTarget?.label || "Applied to"} className={styles.generalFieldWide}>
                            <Dropdown
                                className={styles.controlFullWidth}
                                placeholder={appliesToTarget ? `Select ${appliesToTarget.label.toLowerCase()}` : "No target type is configured"}
                                selectedOptions={appliesTo?.id ? [appliesTo.id] : []}
                                value={appliesTo ? getAppliesToOptionText(appliesTo) : ""}
                                disabled={!isVersionEditable || !appliesToTarget}
                                onOptionSelect={(_, data) => {
                                    if (!isVersionEditable) return;
                                    const selected = appliesToOptions.find((item) => item.id === data.optionValue) || null;
                                    setAppliesTo(selected);
                                    markDefinitionChanged();
                                }}
                            >
                                {appliesToOptions.map((item) => (
                                    <Option key={item.id} value={item.id}>
                                        <span>
                                            {item.category && (
                                                <span className={styles.optionGroupText}>{`${item.category} / `}</span>
                                            )}
                                            {item.name}
                                        </span>
                                    </Option>
                                ))}
                            </Dropdown>
                        </Field>
                    </div>
                </section>
            </div>
        </div>
    );
}

function OptionsTab({
    styles,
    options,
    isVersionEditable,
    updateOption,
}: {
    styles: ReturnType<typeof useStyles>;
    options: ChecklistVersionOption[];
    isVersionEditable: boolean;
    updateOption: (key: string, value: boolean | number | string) => void;
}) {
    return (
        <div className={styles.tabPanel}>
            <div className={styles.optionsList}>
                {options.map((option) => {
                    const definition = CHECKLIST_OPTION_DEFINITIONS.find(
                        (candidate) => candidate.key === option.key
                    );
                    if (!definition) return null;

                    return (
                        <div className={styles.optionRow} key={option.key}>
                            <div className={styles.optionLabel}>
                                <Text weight="semibold">{definition.label}</Text>
                                <Text className={styles.optionDescription}>{definition.description}</Text>
                            </div>
                            {definition.type === "number" ? (
                                <Input
                                    type="number"
                                    min={1}
                                    value={String(option.value || 1)}
                                    disabled={!isVersionEditable}
                                    onChange={(_, data) =>
                                        updateOption(option.key, Math.max(1, Number(data.value) || 1))
                                    }
                                    style={{ width: 96 }}
                                />
                            ) : (
                                <Checkbox
                                    checked={Boolean(option.value)}
                                    disabled={!isVersionEditable}
                                    onChange={(_, data) => updateOption(option.key, Boolean(data.checked))}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TimelineEntry({
    entry,
    index,
    totalEntries,
    relativeTimeNow,
    styles,
}: {
    entry: ChecklistVersionHistoryEntry;
    index: number;
    totalEntries: number;
    relativeTimeNow: Date;
    styles: ReturnType<typeof useStyles>;
}) {
    const isFirst = index === 0;
    const isLast = index === totalEntries - 1;
    const eventDateValue = entry.eventOn || entry.createdOn;
    const friendlyEventDate = formatFriendlyDateTime(eventDateValue, relativeTimeNow);
    const fullEventDate = formatFullTimelineDateTime(eventDateValue);
    const metaParts = [
        entry.eventBy ? `by ${entry.eventBy}` : "",
    ].filter(Boolean);
    const statusTransition = entry.fromStatusLabel || entry.toStatusLabel
        ? `${entry.fromStatusLabel || "-"} -> ${entry.toStatusLabel || "-"}`
        : "";
    const marker = getTimelineEventMarker(entry, styles);
    const TimelineMarkerIcon = marker.Icon;

    return (
        <div className={styles.timelineItem} key={entry.id || `${entry.title}-${index}`}>
            <div className={[
                styles.timelineRail,
                isFirst ? styles.timelineRailFirst : "",
                isLast ? styles.timelineRailLast : "",
            ].filter(Boolean).join(" ")}>
                <span className={[styles.timelineDot, marker.className].filter(Boolean).join(" ")}>
                    <TimelineMarkerIcon />
                </span>
            </div>
            <div className={`${styles.timelineBody} ${isLast ? styles.timelineBodyLast : ""}`}>
                <div className={styles.timelineTitleRow}>
                    <Text className={styles.timelineTitle}>{entry.title || entry.eventTypeLabel || "Checklist version event"}</Text>
                    {friendlyEventDate && (
                        <Tooltip relationship="description" content={fullEventDate || friendlyEventDate}>
                            <span className={styles.timelineRelativeTime}>{friendlyEventDate}</span>
                        </Tooltip>
                    )}
                </div>
                {metaParts.length > 0 && (
                    <Caption1 className={styles.timelineMeta}>{metaParts.join(" | ")}</Caption1>
                )}
                {entry.description && <Text className={styles.timelineText}>{entry.description}</Text>}
                {entry.comments && (
                    <div className={styles.timelineComment}>
                        <span className={styles.timelineCommentLabel}>Comment</span>
                        <Text className={styles.timelineCommentText}>{entry.comments}</Text>
                    </div>
                )}
                {(entry.reviewDecisionLabel || statusTransition) && (
                    <div className={styles.timelineDetails}>
                        {entry.reviewDecisionLabel && (
                            <span className={styles.timelineChip}>{`Decision: ${entry.reviewDecisionLabel}`}</span>
                        )}
                        {statusTransition && (
                            <span className={styles.timelineChip}>{`Status: ${statusTransition}`}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ApprovalHistoryTab({
    styles,
    timelineEntries,
    relativeTimeNow,
}: {
    styles: ReturnType<typeof useStyles>;
    timelineEntries: ChecklistVersionHistoryEntry[];
    relativeTimeNow: Date;
}) {
    return (
        <div className={styles.tabPanel}>
            <div className={styles.formStack}>
                <section className={styles.generalSection}>
                    <div className={styles.generalSectionHeader}>
                        <div className={styles.generalSectionHeading}>
                            <Text className={styles.generalSectionTitle}>Timeline</Text>
                        </div>
                    </div>
                    {timelineEntries.length ? (
                        <div className={styles.timelineList}>
                            {timelineEntries.map((entry, index) => (
                                <TimelineEntry
                                    key={entry.id || `${entry.title}-${index}`}
                                    entry={entry}
                                    index={index}
                                    totalEntries={timelineEntries.length}
                                    relativeTimeNow={relativeTimeNow}
                                    styles={styles}
                                />
                            ))}
                        </div>
                    ) : (
                        <Text className={styles.approvalHistoryEmpty}>No records were found in checklist version history.</Text>
                    )}
                </section>
            </div>
        </div>
    );
}

function ChecklistEditorDialogs({
    styles,
    pendingSubmissionResponse,
    pendingReviewResponse,
    pendingValidationMessage,
    pendingDelete,
    isWorkflowActionRunning,
    versionActionLabel,
    versionActionDescription,
    setPendingSubmissionResponse,
    setPendingReviewResponse,
    setPendingValidationMessage,
    setPendingDelete,
    confirmSubmissionResponse,
    confirmReviewResponse,
    confirmDelete,
    getDeleteConfirmationMessage,
}: {
    styles: ReturnType<typeof useStyles>;
    pendingSubmissionResponse: PendingSubmissionResponse;
    pendingReviewResponse: PendingReviewResponse;
    pendingValidationMessage: PendingValidationMessage;
    pendingDelete: PendingDelete;
    isWorkflowActionRunning: boolean;
    versionActionLabel: string;
    versionActionDescription: string;
    setPendingSubmissionResponse: React.Dispatch<React.SetStateAction<PendingSubmissionResponse>>;
    setPendingReviewResponse: React.Dispatch<React.SetStateAction<PendingReviewResponse>>;
    setPendingValidationMessage: React.Dispatch<React.SetStateAction<PendingValidationMessage>>;
    setPendingDelete: React.Dispatch<React.SetStateAction<PendingDelete>>;
    confirmSubmissionResponse: () => void;
    confirmReviewResponse: () => void;
    confirmDelete: () => void;
    getDeleteConfirmationMessage: () => string;
}) {
    return (
        <>
            <ChecklistEditorDialogs
                styles={styles}
                pendingSubmissionResponse={pendingSubmissionResponse}
                pendingReviewResponse={pendingReviewResponse}
                pendingValidationMessage={pendingValidationMessage}
                pendingDelete={pendingDelete}
                isWorkflowActionRunning={isWorkflowActionRunning}
                versionActionLabel={versionActionLabel}
                versionActionDescription={versionActionDescription}
                setPendingSubmissionResponse={setPendingSubmissionResponse}
                setPendingReviewResponse={setPendingReviewResponse}
                setPendingValidationMessage={setPendingValidationMessage}
                setPendingDelete={setPendingDelete}
                confirmSubmissionResponse={confirmSubmissionResponse}
                confirmReviewResponse={confirmReviewResponse}
                confirmDelete={confirmDelete}
                getDeleteConfirmationMessage={getDeleteConfirmationMessage}
            />
        </>
    );
}

function ChecklistDetails({
    version,
    statusOptions,
    onVersionSaved,
    useCompactVersionHeader,
    t,
}: {
    version: ChecklistVersion;
    statusOptions: Record<number, StatusOption>;
    onVersionSaved: (version: ChecklistVersion) => void;
    useCompactVersionHeader?: boolean;
    t: (key: string) => string;
}) {
    const styles = useStyles();
    const sectionActionNavigation = useArrowNavigationGroup({ axis: "horizontal" });
    const sectionActionsDescriptionId = "checklist-section-actions-description";
    const checklist = version.checklist;
    const [activeTab, setActiveTab] = useState("general");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [hasDefinitionChanges, setHasDefinitionChanges] = useState(false);
    const {
        appliesToOptions,
        identificationOptions,
        requiresChecklistVersionReview,
        userCanApproveChecklistVersion,
    } = useChecklistReferenceData(checklist.targetTypeValue);
    const [checklistName, setChecklistName] = useState(
        version.definition.checklistVersionDetails.checklistName || checklist.name
    );
    const [versionType, setVersionType] = useState(version.versionType || version.definition.checklistVersionDetails.versionType || VERSION_TYPE_MINOR);
    const [versionNumber, setVersionNumber] = useState(
        version.versionNumber || version.definition.checklistVersionDetails.versionNumber || ""
    );
    const [description, setDescription] = useState(
        version.description || version.definition.checklistVersionDetails.description || ""
    );
    const [appliesTo, setAppliesTo] = useState<AppliesToSelection | null>(version.definition.checklistVersionDetails.appliesTo);
    const [options, setOptions] = useState(version.definition.checklistVersionDetails.options);
    const [sections, setSections] = useState(version.definition.checklistVersionContents.sections);
    const [requiredChecklistOptionsByEquipmentType, setRequiredChecklistOptionsByEquipmentType] = useState<Record<string, RequiredChecklistRunOption[]>>({});
    const [loadingRequiredChecklistEquipmentTypeId, setLoadingRequiredChecklistEquipmentTypeId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState(
        flattenSections(version.definition.checklistVersionContents.sections)[0]?.section.id || ""
    );
    const [highlightedSectionId, setHighlightedSectionId] = useState(
        flattenSections(version.definition.checklistVersionContents.sections)[0]?.section.id || ""
    );
    const [selectedItemId, setSelectedItemId] = useState("");
    const [focusedSectionAction, setFocusedSectionAction] = useState<SectionKeyboardTarget | null>(null);
    const [focusedItemAction, setFocusedItemAction] = useState<ItemKeyboardTarget | null>(null);
    const [focusedAddButtonKey, setFocusedAddButtonKey] = useState("");
    const [keyboardPane, setKeyboardPane] = useState<KeyboardPane>("sections");
    const [keyboardNavigationActive, setKeyboardNavigationActive] = useState(false);
    const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
    const [draftSection, setDraftSection] = useState<DraftSection | null>(null);
    const [draftItem, setDraftItem] = useState<DraftItem | null>(null);
    const [editingSectionId, setEditingSectionId] = useState("");
    const [sectionNameDraft, setSectionNameDraft] = useState("");
    const [editingSelectedSectionTitleId, setEditingSelectedSectionTitleId] = useState("");
    const [selectedSectionTitleDraft, setSelectedSectionTitleDraft] = useState("");
    const [draggedItem, setDraggedItem] = useState<DraggedItem>(null);
    const draggedSectionIdRef = useRef("");
    const draggedItemRef = useRef<DraggedItem>(null);
    const sectionPointerDragRef = useRef<SectionPointerDrag>(null);
    const itemPointerDragRef = useRef<ItemPointerDrag>(null);
    const itemNameInputRef = useRef<HTMLInputElement>(null);
    const contentsPanelRef = useRef<HTMLDivElement>(null);
    const sectionTreeBodyRef = useRef<HTMLDivElement>(null);
    const ignoreNextSectionClickRef = useRef(false);
    const ignoreNextItemClickRef = useRef(false);
    const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget>(null);
    const dragOverTargetRef = useRef<DragOverTarget>(null);
    const updateDragOverTarget = (target: DragOverTarget) => {
        if (areDragOverTargetsEqual(dragOverTargetRef.current, target)) return;
        dragOverTargetRef.current = target;
        setDragOverTarget(target);
    };
    const sectionDropIndicator = useSectionDropIndicator(dragOverTarget, sectionTreeBodyRef);
    const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
    const [pendingValidationMessage, setPendingValidationMessage] = useState<PendingValidationMessage>(null);
    const [pendingReviewResponse, setPendingReviewResponse] = useState<PendingReviewResponse>(null);
    const [pendingSubmissionResponse, setPendingSubmissionResponse] = useState<PendingSubmissionResponse>(null);
    const [isWorkflowActionRunning, setIsWorkflowActionRunning] = useState(false);
    const [relativeTimeNow, setRelativeTimeNow] = useState(() => new Date());
    const { shortcutNotice, showShortcutNotice } = useShortcutNotice();
    const sectionFocusResetTimerRef = useRef<number | null>(null);
    const [hoveredSectionId, setHoveredSectionId] = useState("");
    const [hoveredItemId, setHoveredItemId] = useState("");
    const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
        () => new Set(getSectionIdsWithChildren(version.definition.checklistVersionContents.sections))
    );

    useEffect(() => {
        return () => {
            if (sectionFocusResetTimerRef.current) window.clearTimeout(sectionFocusResetTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const timerId = window.setInterval(() => setRelativeTimeNow(new Date()), 60000);
        return () => window.clearInterval(timerId);
    }, []);

    useUnsavedChangesWarning(hasDefinitionChanges, isSaving);

    const currentDefinition = useMemo(
        () =>
            buildChecklistVersionDefinition({
                checklist,
                checklistName,
                versionType,
                versionNumber,
                description,
                appliesTo,
                options,
                sections,
            }),
        [appliesTo, checklist, checklistName, description, options, sections, versionNumber, versionType]
    );
    const appliesToTarget = APPLIES_TO_TARGETS[checklist.targetTypeValue];
    const flattenedSections = useMemo(() => flattenSections(sections), [sections]);
    const hasChecklistSections = flattenedSections.length > 0;
    const hasChecklistItems = flattenedSections.some(({ section }) => section.items.length > 0);
    const hasEmptySections = flattenedSections.some(
        ({ section }) => section.sections.length === 0 && section.items.length === 0
    );
    const workflowState = getChecklistVersionWorkflowState({
        version,
        requiresChecklistVersionReview,
        userCanApproveChecklistVersion,
        hasDefinitionChanges,
        hasChecklistSections,
        hasChecklistItems,
        hasEmptySections,
        isWorkflowActionRunning,
    });
    const {
        isVersionEditable,
        canShowApprovalHistory,
        requiresAmendments,
        reviewerComments,
        canShowSubmitForApproval,
        canSubmitForApproval,
        canRespondToReview,
        versionActionLabel,
        versionActionDescription,
        versionActionDisabledReason,
        isVersionActionDisabled,
    } = workflowState;
    const isEditorDisabled = !isVersionEditable || isSaving;
    const canShowVersionAction = canShowSubmitForApproval && !hasDefinitionChanges && !isSaving;
    const showAddContentActions = !isEditorDisabled;
    const showEditHoverActions = !isEditorDisabled;

    useEffect(() => {
        if (showEditHoverActions) return;
        setHoveredSectionId("");
        setHoveredItemId("");
        setKeyboardNavigationActive(false);
        setIsShortcutHelpOpen(false);
    }, [showEditHoverActions]);

    const markDefinitionChanged = () => {
        if (!isEditorDisabled) setHasDefinitionChanges(true);
    };
    const updateSections = (updater: React.SetStateAction<ChecklistSection[]>) => {
        if (isEditorDisabled) return;
        setSections(updater);
        markDefinitionChanged();
    };
    const updateOption = (key: string, value: boolean | number | string) => {
        if (isEditorDisabled) return;
        setOptions((current) =>
            current.map((option) => (option.key === key ? { ...option, value } : option))
        );
        markDefinitionChanged();
    };
    useEffect(() => {
        if (isVersionEditable) return;
        setHasDefinitionChanges(false);
        setDraftSection(null);
        setDraftItem(null);
        setEditingSectionId("");
        setEditingSelectedSectionTitleId("");
        setPendingDelete(null);
        updateDragOverTarget(null);
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        draggedItemRef.current = null;
        sectionPointerDragRef.current = null;
        itemPointerDragRef.current = null;
    }, [isVersionEditable]);

    useEffect(() => {
        if (!editingSelectedSectionTitleId || editingSelectedSectionTitleId === selectedSectionId) return;
        setEditingSelectedSectionTitleId("");
    }, [editingSelectedSectionTitleId, selectedSectionId]);

    useEffect(() => {
        if (activeTab === "approvalHistory" && !canShowApprovalHistory) {
            setActiveTab("general");
        }
    }, [activeTab, canShowApprovalHistory]);

    const rootOpenSectionIds = useMemo(
        () => getOpenSiblingSectionIds(sections, collapsedSectionIds),
        [collapsedSectionIds, sections]
    );
    const visibleSections = useMemo(() => flattenVisibleSections(sections, collapsedSectionIds), [collapsedSectionIds, sections]);
    const canFocusAddActions = !isEditorDisabled && !draftSection && !draftItem;
    const sectionKeyboardTargets = useMemo(() => {
        const buildTargets = (items: ChecklistSection[]): SectionKeyboardTarget[] =>
            items.flatMap((section) => {
                const isCollapsed = collapsedSectionIds.has(section.id);
                const childTargets = isCollapsed ? [] : buildTargets(section.sections);
                const canAddChild =
                    canFocusAddActions &&
                    !isCollapsed &&
                    section.parentId === null &&
                    section.sections.length > 0;
                return [
                    { type: "section", sectionId: section.id } as SectionKeyboardTarget,
                    ...childTargets,
                    ...(canAddChild ? [{ type: "addChildSection", sectionId: section.id } as SectionKeyboardTarget] : []),
                ];
            });
        return [
            ...buildTargets(sections),
            ...(canFocusAddActions ? [{ type: "addTopLevelSection" } as SectionKeyboardTarget] : []),
        ];
    }, [canFocusAddActions, collapsedSectionIds, sections]);
    const selectedSection = useMemo(
        () => findSectionById(sections, selectedSectionId),
        [sections, selectedSectionId]
    );
    const highlightedSection = useMemo(
        () => findSectionById(sections, highlightedSectionId),
        [highlightedSectionId, sections]
    );
    const selectedSectionPath = useMemo(
        () => findSectionPathById(sections, selectedSectionId),
        [sections, selectedSectionId]
    );
    const selectedSectionDepth = flattenedSections.find(({ section }) => section.id === selectedSectionId)?.depth ?? 0;
    const selectedSectionHasChildren = Boolean(selectedSection && selectedSection.sections.length > 0);
    const selectedSectionIsEmptyTopLevel = Boolean(
        selectedSection &&
        selectedSectionDepth === 0 &&
        selectedSection.items.length === 0 &&
        selectedSection.sections.length === 0
    );
    const selectedItem = useMemo(
        () => selectedSection?.items.find((item) => item.id === selectedItemId) || null,
        [selectedItemId, selectedSection]
    );
    const itemKeyboardTargets = useMemo<ItemKeyboardTarget[]>(() => {
        if (!selectedSection || selectedSection.sections.length > 0) return [];
        return [
            ...selectedSection.items.map((item) => ({ type: "item", itemId: item.id } as ItemKeyboardTarget)),
            ...(canFocusAddActions ? [{ type: "addItem" } as ItemKeyboardTarget] : []),
        ];
    }, [canFocusAddActions, selectedSection]);
    useEffect(() => {
        if (
            draftItem &&
            !draftItem.itemId &&
            draftItem.name === "" &&
            draftItem.description === "" &&
	            draftItem.quantity === "" &&
	            !draftItem.requestItemIdentification &&
	            draftItem.identificationCategoryId === "" &&
	            draftItem.identificationTargetTypeValue === null &&
	            draftItem.identificationTargetId === "" &&
	            draftItem.identificationTarget === null &&
	            !draftItem.requiresChecklistRuns &&
	            draftItem.requiredChecklistRunIds.length === 0 &&
	            draftItem.requiredChecklistRuns.length === 0
	        ) {
	            itemNameInputRef.current?.focus();
	        }
    }, [
        draftItem?.sectionId,
        draftItem?.itemId,
        draftItem?.name,
        draftItem?.description,
	        draftItem?.quantity,
	        draftItem?.requestItemIdentification,
	        draftItem?.identificationCategoryId,
	        draftItem?.identificationTargetTypeValue,
	        draftItem?.identificationTargetId,
	        draftItem?.identificationTarget,
	        draftItem?.requiresChecklistRuns,
	        draftItem?.requiredChecklistRunIds,
	        draftItem?.requiredChecklistRuns,
	    ]);
	    useEffect(() => {
	        const equipmentTypeId = draftItem?.requestItemIdentification ? draftItem.identificationTargetId : "";
	        if (!equipmentTypeId || requiredChecklistOptionsByEquipmentType[equipmentTypeId]) return;
	        let isMounted = true;
	        const loadingTimeoutId = window.setTimeout(() => {
	            if (!isMounted) return;
	            setRequiredChecklistOptionsByEquipmentType((current) => ({
	                ...current,
	                [equipmentTypeId]: current[equipmentTypeId] || [],
	            }));
	            setLoadingRequiredChecklistEquipmentTypeId((current) =>
	                current === equipmentTypeId ? "" : current
	            );
	        }, 12000);
	        setLoadingRequiredChecklistEquipmentTypeId(equipmentTypeId);
	        loadPublishedChecklistRunOptionsForEquipmentType(equipmentTypeId, checklist.id || "")
	            .then((items) => {
	                if (!isMounted) return;
	                window.clearTimeout(loadingTimeoutId);
	                setRequiredChecklistOptionsByEquipmentType((current) => ({
	                    ...current,
	                    [equipmentTypeId]: items,
	                }));
	            })
	            .catch(() => {
	                if (!isMounted) return;
	                window.clearTimeout(loadingTimeoutId);
	                setRequiredChecklistOptionsByEquipmentType((current) => ({
	                    ...current,
	                    [equipmentTypeId]: [],
	                }));
	            })
	            .finally(() => {
	                if (isMounted) setLoadingRequiredChecklistEquipmentTypeId("");
	            });
	        return () => {
	            isMounted = false;
	            window.clearTimeout(loadingTimeoutId);
	        };
	    }, [
	        checklist.id,
	        draftItem?.requestItemIdentification,
	        draftItem?.identificationTargetId,
	        requiredChecklistOptionsByEquipmentType,
	    ]);
    const clearKeyboardFocusResetTimer = () => {
        if (sectionFocusResetTimerRef.current) {
            window.clearTimeout(sectionFocusResetTimerRef.current);
            sectionFocusResetTimerRef.current = null;
        }
    };
    const clearKeyboardFocusMode = () => {
        setHighlightedSectionId(selectedSectionId);
        setFocusedSectionAction(null);
        setFocusedItemAction(null);
        setFocusedAddButtonKey("");
        setKeyboardNavigationActive(false);
    };
    const resetKeyboardFocusMode = () => {
        clearKeyboardFocusMode();
        if (
            document.activeElement instanceof HTMLElement &&
            contentsPanelRef.current?.contains(document.activeElement)
        ) {
            document.activeElement.blur();
            contentsPanelRef.current?.focus();
        }
        sectionFocusResetTimerRef.current = null;
    };
    const scheduleKeyboardFocusReset = () => {
        clearKeyboardFocusResetTimer();
        sectionFocusResetTimerRef.current = window.setTimeout(resetKeyboardFocusMode, 5000);
    };
    const selectSection = (sectionId: string) => {
        clearKeyboardFocusResetTimer();
        setKeyboardNavigationActive(false);
        setSelectedSectionId(sectionId);
        setHighlightedSectionId(sectionId);
        setSelectedItemId("");
        setFocusedSectionAction(null);
        setFocusedItemAction(null);
        setFocusedAddButtonKey("");
    };
    const selectSectionPane = (sectionId: string) => {
        setKeyboardPane("sections");
        selectSection(sectionId);
    };
    const focusSectionsPaneForContentTab = () => {
        clearKeyboardFocusResetTimer();
        clearKeyboardFocusMode();
        setKeyboardPane("sections");
        setSelectedItemId("");
        setFocusedItemAction(null);
        setFocusedAddButtonKey("");
        const selectedVisibleSection = visibleSections.find(({ section }) => section.id === selectedSectionId)?.section;
        const firstVisibleSection = visibleSections[0]?.section || null;
        const nextSection = selectedVisibleSection || firstVisibleSection;
        if (nextSection) {
            setHighlightedSectionId(nextSection.id);
            setFocusedSectionAction(null);
            setKeyboardNavigationActive(false);
            return;
        }
        const addTopLevelTarget = sectionKeyboardTargets.find((target) => target.type === "addTopLevelSection") || null;
        if (addTopLevelTarget) {
            setFocusedSectionAction(addTopLevelTarget);
            setKeyboardNavigationActive(false);
            return;
        }
        setFocusedSectionAction(null);
        setKeyboardNavigationActive(false);
    };
    const moveSectionHighlight = (direction: 1 | -1) => {
        if (!sectionKeyboardTargets.length) return;
        const currentIndex = focusedSectionAction
            ? sectionKeyboardTargets.findIndex((target) =>
                  target.type === focusedSectionAction.type &&
                  (target.type === "addTopLevelSection" || focusedSectionAction.type === "addTopLevelSection"
                      ? true
                      : target.sectionId === focusedSectionAction.sectionId)
              )
            : sectionKeyboardTargets.findIndex((target) => target.type === "section" && target.sectionId === highlightedSectionId);
        const nextIndex =
            currentIndex < 0
                ? 0
                : Math.min(sectionKeyboardTargets.length - 1, Math.max(0, currentIndex + direction));
        const nextTarget = sectionKeyboardTargets[nextIndex];
        setKeyboardPane("sections");
        setSelectedItemId("");
        setFocusedItemAction(null);
        if (nextTarget.type === "section") {
            setHighlightedSectionId(nextTarget.sectionId);
            setFocusedSectionAction(null);
            setFocusedAddButtonKey("");
        } else {
            setFocusedSectionAction(nextTarget);
            setFocusedAddButtonKey("");
        }
        scheduleKeyboardFocusReset();
    };
    const moveItemHighlight = (direction: 1 | -1) => {
        if (!itemKeyboardTargets.length) return;
        const currentIndex = focusedItemAction
            ? itemKeyboardTargets.findIndex((target) => target.type === focusedItemAction.type)
            : itemKeyboardTargets.findIndex((target) => target.type === "item" && target.itemId === selectedItemId);
        const nextIndex =
            currentIndex < 0
                ? 0
                : Math.min(itemKeyboardTargets.length - 1, Math.max(0, currentIndex + direction));
        const nextTarget = itemKeyboardTargets[nextIndex];
        setFocusedSectionAction(null);
        if (nextTarget.type === "item") {
            setSelectedItemId(nextTarget.itemId);
            setFocusedItemAction(null);
            setFocusedAddButtonKey("");
        } else {
            setFocusedItemAction(nextTarget);
            setFocusedAddButtonKey("");
        }
        scheduleKeyboardFocusReset();
    };
    const moveContentsHighlight = (direction: 1 | -1) => {
        setKeyboardNavigationActive(true);
        if (keyboardPane === "items" && itemKeyboardTargets.length) {
            moveItemHighlight(direction);
            return;
        }
        setKeyboardPane("sections");
        moveSectionHighlight(direction);
    };
    const moveKeyboardPane = (pane: KeyboardPane) => {
        setKeyboardPane(pane);
        setFocusedSectionAction(null);
        setFocusedItemAction(null);
        setFocusedAddButtonKey("");
        if (pane === "items" && selectedSection?.items.length && !selectedItem) {
            setSelectedItemId(selectedSection.items[0].id);
        }
    };
    const switchContentsKeyboardPane = () => {
        setKeyboardNavigationActive(true);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (keyboardPane === "sections" && selectedSection) {
            moveKeyboardPane("items");
        } else {
            moveKeyboardPane("sections");
        }
        scheduleKeyboardFocusReset();
        window.setTimeout(() => contentsPanelRef.current?.focus(), 0);
    };
    const addActionFocusStyle: React.CSSProperties = {
        boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}, 0 0 0 4px ${tokens.colorBrandStroke1}`,
        outline: `2px solid ${tokens.colorBrandStroke1}`,
        outlineOffset: "2px",
        borderRadius: tokens.borderRadiusMedium,
    };
    const getAddActionFocusStyle = (isFocused: boolean): React.CSSProperties | undefined =>
        isFocused ? addActionFocusStyle : undefined;
    const activateFocusedSectionAction = () => {
        if (!focusedSectionAction) return false;
        if (focusedSectionAction.type === "addTopLevelSection") {
            startNewSection(null);
            return true;
        }
        if (focusedSectionAction.type === "addChildSection") {
            startNewSection(focusedSectionAction.sectionId);
            return true;
        }
        return false;
    };
    const activateFocusedItemAction = () => {
        if (!focusedItemAction || !selectedSection) return false;
        if (focusedItemAction.type === "addItem") {
            startNewItem(selectedSection.id);
            return true;
        }
        return false;
    };
    const startSectionAfterFocus = () => {
        const focusedSection = keyboardNavigationActive ? highlightedSection : null;
        if (!focusedSection) {
            startNewSection(null);
            return;
        }
        const targetPath = findSectionPathById(sections, focusedSection.id);
        const parentSection = targetPath.length > 1 ? targetPath[targetPath.length - 2] : null;
        startNewSection(parentSection?.id || null, focusedSection.id);
    };
    const startChildSectionFromFocus = () => {
        const focusedSection = keyboardNavigationActive ? highlightedSection : null;
        if (!focusedSection) {
            showShortcutNotice("Highlight a section before adding a child section.");
            return;
        }
        if (focusedSection.parentId) {
            showShortcutNotice("Child sections can only be added beneath top-level sections.");
            return;
        }
        if (focusedSection.items.length > 0) {
            showShortcutNotice("Child sections cannot be added because this section already contains checklist items.");
            return;
        }
        startNewSection(focusedSection.id);
    };
    const startItemAfterFocus = () => {
        if (!selectedSection) {
            showShortcutNotice("Select a section before adding an item.");
            return;
        }
        if (selectedSection.sections.length > 0) {
            showShortcutNotice("Items cannot be added because this section contains child sections.");
            return;
        }
        startNewItem(selectedSection.id, keyboardNavigationActive ? selectedItemId || null : null);
    };
    const expandSectionInSet = (current: Set<string>, sectionId: string) => {
        const next = new Set(current);
        next.delete(sectionId);
        return next;
    };
    const startNewSection = (parentId: string | null, afterSectionId: string | null = null) => {
        if (isEditorDisabled) return;
        setKeyboardPane("sections");
        setKeyboardNavigationActive(false);
        setFocusedSectionAction(null);
        setFocusedItemAction(null);
        if (parentId) {
            selectSection(parentId);
        }
        setDraftSection({ parentId, afterSectionId, name: "" });
        setDraftItem(null);
        if (parentId) {
            setCollapsedSectionIds((current) => {
                return expandSectionInSet(current, parentId);
            });
        }
    };
    const confirmHighlightedSection = () => {
        if (!highlightedSection) return;
        if (sectionFocusResetTimerRef.current) {
            window.clearTimeout(sectionFocusResetTimerRef.current);
            sectionFocusResetTimerRef.current = null;
        }
        if (highlightedSection.sections.length > 0) {
            setCollapsedSectionIds((current) => {
                const next = new Set(current);
                if (next.has(highlightedSection.id)) {
                    next.delete(highlightedSection.id);
                } else {
                    next.add(highlightedSection.id);
                }
                return next;
            });
            return;
        }
        if (selectedSectionId !== highlightedSection.id) {
            selectSection(highlightedSection.id);
            return;
        }
    };
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey) return;
            const key = event.key.toLowerCase();
            if (key === "s" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (!isEditorDisabled && hasDefinitionChanges) handleSave();
                return;
            }
            if (activeTab !== "contents") return;
            if (isEditorDisabled) return;
            if (event.ctrlKey || event.metaKey) return;
            if (isEditableKeyboardTarget(event.target)) return;
            if (draftSection || draftItem || editingSectionId || editingSelectedSectionTitleId) return;

            if (event.key === "Tab") {
                event.preventDefault();
                switchContentsKeyboardPane();
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                moveContentsHighlight(-1);
                return;
            }
            if (event.key === "ArrowDown") {
                event.preventDefault();
                moveContentsHighlight(1);
                return;
            }
            if (event.key === "Enter" && keyboardPane === "sections") {
                if (isEditorDisabled) return;
                event.preventDefault();
                if (event.shiftKey) {
                    startChildSectionFromFocus();
                } else {
                    startSectionAfterFocus();
                }
                return;
            }
            if (event.key === " " && keyboardPane === "sections" && keyboardNavigationActive && focusedSectionAction) {
                event.preventDefault();
                activateFocusedSectionAction();
                return;
            }
            if (event.key === " " && keyboardPane === "sections" && keyboardNavigationActive && highlightedSection) {
                event.preventDefault();
                confirmHighlightedSection();
                return;
            }
            if (event.key === "Enter" && keyboardPane === "items") {
                if (isEditorDisabled) return;
                event.preventDefault();
                startItemAfterFocus();
                return;
            }
            if (event.key === " " && keyboardPane === "items" && keyboardNavigationActive && focusedItemAction) {
                if (isEditorDisabled) return;
                event.preventDefault();
                activateFocusedItemAction();
                return;
            }
            if (event.key === " " && keyboardPane === "items" && keyboardNavigationActive && selectedSection && selectedItem) {
                if (isEditorDisabled) return;
                event.preventDefault();
                if (activateFocusedItemAction()) return;
                startEditItem(selectedSection.id, selectedItem);
                return;
            }
            if (
                (event.key === "Delete" || event.key === "Backspace") &&
                keyboardNavigationActive &&
                keyboardPane === "sections" &&
                highlightedSection
            ) {
                if (isEditorDisabled) return;
                event.preventDefault();
                requestDeleteSection(highlightedSection);
                return;
            }
            if (
                (event.key === "Delete" || event.key === "Backspace") &&
                keyboardNavigationActive &&
                keyboardPane === "items" &&
                selectedSection &&
                selectedItem
            ) {
                if (isEditorDisabled) return;
                event.preventDefault();
                requestDeleteItem(selectedSection.id, selectedItem);
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
        activeTab,
        draftItem,
        draftSection,
        editingSectionId,
        editingSelectedSectionTitleId,
        focusedItemAction,
        focusedSectionAction,
        highlightedSection,
        hasDefinitionChanges,
        itemKeyboardTargets,
        isEditorDisabled,
        isSaving,
        keyboardNavigationActive,
        keyboardPane,
        selectedItem,
        selectedItemId,
        selectedSection,
        selectedSectionId,
        selectedSectionPath,
        sectionKeyboardTargets,
        switchContentsKeyboardPane,
        visibleSections,
    ]);
    const showDuplicateSectionNameMessage = (parentId: string | null) => {
        setPendingValidationMessage({
            title: "Duplicate section name",
            message: parentId
                ? "A child section with this name already exists under the same parent section. Use a unique name for sections under this parent."
                : "A top-level section with this name already exists. Use a unique top-level section name.",
        });
    };
    const confirmDraftSection = () => {
        if (isEditorDisabled) return;
        const nextName = draftSection?.name.trim() || "";
        if (!draftSection || !nextName) return;
        if (hasDuplicateSectionNameInLevel(sections, draftSection.parentId, nextName)) {
            showDuplicateSectionNameMessage(draftSection.parentId);
            return;
        }
        const newSection = createEmptySection(nextName, draftSection.parentId);
        updateSections((current) => addSection(current, draftSection.parentId, newSection, draftSection.afterSectionId));
        if (draftSection.parentId) {
            setCollapsedSectionIds((current) => expandSectionInSet(current, draftSection.parentId || ""));
        }
        selectSection(newSection.id);
        setDraftSection(null);
    };
    const handleSectionTreeOpenChange = (
        _: unknown,
        data: { open?: boolean; openItems: Iterable<unknown>; value?: unknown }
    ) => {
        if (data.value === undefined) return;
        const sectionId = String(data.value);
        setCollapsedSectionIds((current) => {
            const next = new Set(current);
            if (data.open) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };
    const startNewItem = (sectionId: string, afterItemId: string | null = null) => {
        if (isEditorDisabled) return;
        setKeyboardPane("items");
        setSelectedItemId("");
        setFocusedSectionAction(null);
        setFocusedItemAction(null);
	        setDraftItem({
	            sectionId,
	            afterItemId,
	            name: "",
	            description: "",
	            quantity: "",
	            requestItemIdentification: false,
	            identificationCategoryId: "",
	            identificationTargetTypeValue: null,
	            identificationTargetId: "",
	            identificationTarget: null,
	            requiresChecklistRuns: false,
	            requiredChecklistRunIds: [],
	            requiredChecklistRuns: [],
	        });
        setDraftSection(null);
    };
    const startEditSectionName = (section: ChecklistSection) => {
        if (isEditorDisabled) return;
        selectSectionPane(section.id);
        setSectionNameDraft(section.name || "");
        setEditingSectionId(section.id);
        setDraftItem(null);
    };
    const confirmEditingSectionName = () => {
        if (isEditorDisabled) return;
        const section = findSectionById(sections, editingSectionId);
        if (!section) {
            setEditingSectionId("");
            return;
        }
        const nextName = sectionNameDraft.trim();
        if (!nextName) {
            setSectionNameDraft(section.name || "");
            setEditingSectionId("");
            return;
        }
        const parentId = getSectionParentId(sections, editingSectionId);
        if (hasDuplicateSectionNameInLevel(sections, parentId, nextName, editingSectionId)) {
            showDuplicateSectionNameMessage(parentId);
            return;
        }
        updateSections((current) => updateSectionName(current, editingSectionId, nextName));
        setEditingSectionId("");
    };
    const startEditSelectedSectionTitle = (section: ChecklistSection) => {
        if (isEditorDisabled) return;
        selectSectionPane(section.id);
        setSelectedSectionTitleDraft(section.name || "");
        setEditingSelectedSectionTitleId(section.id);
        setEditingSectionId("");
        setDraftSection(null);
        setDraftItem(null);
    };
    const confirmEditingSelectedSectionTitle = () => {
        if (isEditorDisabled) return;
        const section = findSectionById(sections, editingSelectedSectionTitleId);
        if (!section) {
            setEditingSelectedSectionTitleId("");
            return;
        }
        const nextName = selectedSectionTitleDraft.trim();
        if (!nextName) {
            setSelectedSectionTitleDraft(section.name || "");
            setEditingSelectedSectionTitleId("");
            return;
        }
        const parentId = getSectionParentId(sections, editingSelectedSectionTitleId);
        if (hasDuplicateSectionNameInLevel(sections, parentId, nextName, editingSelectedSectionTitleId)) {
            showDuplicateSectionNameMessage(parentId);
            return;
        }
        updateSections((current) => updateSectionName(current, editingSelectedSectionTitleId, nextName));
        setEditingSelectedSectionTitleId("");
    };
	    const startEditItem = (sectionId: string, item: ChecklistItem) => {
	        if (isEditorDisabled) return;
	        setKeyboardPane("items");
	        setSelectedItemId(item.id);
	        const equipmentTarget =
	            item.identificationTarget?.entityName === "int_equipmenttype"
	                ? item.identificationTarget
	                : null;
	        const equipmentCategory =
	            equipmentTarget?.groupId
	                ? findIdentificationTargetGroupById(identificationOptions, CHECKLIST_TARGET_EQUIPMENT, equipmentTarget.groupId)
	                : findIdentificationTargetGroupForTargetId(identificationOptions, CHECKLIST_TARGET_EQUIPMENT, equipmentTarget?.id || "");
	        setDraftItem({
	            sectionId,
	            itemId: item.id,
	            name: item.name,
	            description: item.description,
	            quantity: item.quantity === null || item.quantity === undefined ? "" : String(item.quantity),
	            requestItemIdentification: Boolean(item.requestItemIdentification && equipmentTarget),
	            identificationCategoryId: equipmentCategory?.id || equipmentTarget?.groupId || "",
	            identificationTargetTypeValue: equipmentTarget ? CHECKLIST_TARGET_EQUIPMENT : null,
	            identificationTargetId: equipmentTarget?.id || "",
	            identificationTarget: equipmentTarget,
	            requiresChecklistRuns: Boolean(item.requiresChecklistRuns),
	            requiredChecklistRunIds: item.requiredChecklistRuns.map((checklist) => checklist.id),
	            requiredChecklistRuns: item.requiredChecklistRuns,
	        });
	        setDraftSection(null);
	    };
    const confirmDraftItem = (continueAdding = false) => {
        if (isEditorDisabled) return false;
        if (!draftItem?.name.trim()) return false;
	        if (
	            draftItem.requestItemIdentification &&
	            (
	                !draftItem.identificationCategoryId ||
	                !draftItem.identificationTargetId ||
	                (draftItem.requiresChecklistRuns && draftItem.requiredChecklistRunIds.length === 0)
	            )
	        ) return false;
        const item = createChecklistItemFromDraft(draftItem, identificationOptions);
        const sectionId = draftItem.sectionId;
        updateSections((current) =>
            draftItem.itemId
                ? updateItemInSection(current, sectionId, item)
                : addItemToSection(current, sectionId, item, draftItem.afterItemId)
        );
        setSelectedItemId(continueAdding ? "" : item.id);
        setDraftItem(continueAdding ? {
            sectionId,
            afterItemId: item.id,
            name: "",
	            description: "",
	            quantity: "",
	            requestItemIdentification: false,
	            identificationCategoryId: "",
	            identificationTargetTypeValue: null,
	            identificationTargetId: "",
	            identificationTarget: null,
	            requiresChecklistRuns: false,
	            requiredChecklistRunIds: [],
	            requiredChecklistRuns: [],
	        } : null);
        return true;
    };
    const cancelDraftItem = () => {
        const cancelledDraft = draftItem;
        setDraftItem(null);
        if (!cancelledDraft || cancelledDraft.itemId) return;
        const draftSection = findSectionById(sections, cancelledDraft.sectionId);
        const isFreshEmptySection = Boolean(
            draftSection &&
            draftSection.items.length === 0 &&
            draftSection.sections.length === 0
        );
        if (!isFreshEmptySection) return;
        setKeyboardPane("sections");
        setHighlightedSectionId(cancelledDraft.sectionId);
        setSelectedItemId("");
        setKeyboardNavigationActive(true);
    };
    const handleItemEditKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            event.preventDefault();
            confirmDraftItem(event.shiftKey);
        }
        if (event.key === "Escape") {
            event.preventDefault();
            cancelDraftItem();
        }
    };
    const handleSectionTreeKeyDown = (event: React.KeyboardEvent) => {
        if (isEditorDisabled) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.defaultPrevented && event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== " ") return;
        if (isEditableKeyboardTarget(event.target)) return;
        if (draftSection || draftItem || editingSectionId || editingSelectedSectionTitleId) return;

        if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            moveContentsHighlight(-1);
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            moveContentsHighlight(1);
            return;
        }
        if (event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setKeyboardNavigationActive(true);
            setKeyboardPane("sections");
            if (activateFocusedSectionAction()) return;
            confirmHighlightedSection();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            switchContentsKeyboardPane();
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            setKeyboardNavigationActive(true);
            setKeyboardPane("sections");
            if (event.shiftKey) {
                startChildSectionFromFocus();
            } else {
                startSectionAfterFocus();
            }
            return;
        }
        if (
            (event.key === "Delete" || event.key === "Backspace") &&
            keyboardNavigationActive &&
            highlightedSection
        ) {
            event.preventDefault();
            event.stopPropagation();
            requestDeleteSection(highlightedSection);
        }
    };
    useEffect(() => {
        const handlePageEscapeKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (pendingValidationMessage) {
                setPendingValidationMessage(null);
                return;
            }
            if (pendingDelete) {
                setPendingDelete(null);
                return;
            }
            if (pendingReviewResponse) {
                setPendingReviewResponse(null);
                return;
            }
            if (pendingSubmissionResponse) {
                setPendingSubmissionResponse(null);
                return;
            }
            if (draggedItem || draggedSectionIdRef.current || draggedItemRef.current || dragOverTarget) {
                sectionPointerDragRef.current = null;
                itemPointerDragRef.current = null;
                draggedSectionIdRef.current = "";
                draggedItemRef.current = null;
                setDraggedItem(null);
                updateDragOverTarget(null);
                return;
            }
            if (draftItem) {
                cancelDraftItem();
                return;
            }
            if (draftSection) {
                setDraftSection(null);
                return;
            }
            if (editingSectionId) {
                setEditingSectionId("");
                return;
            }
            if (editingSelectedSectionTitleId) {
                setEditingSelectedSectionTitleId("");
                return;
            }
            if (isShortcutHelpOpen) {
                setIsShortcutHelpOpen(false);
                return;
            }
            if (keyboardNavigationActive) {
                setHighlightedSectionId(selectedSectionId);
                setKeyboardNavigationActive(false);
            }
        };

        window.addEventListener("keydown", handlePageEscapeKeyDown, true);
        return () => window.removeEventListener("keydown", handlePageEscapeKeyDown, true);
    }, [
        cancelDraftItem,
        dragOverTarget,
        draggedItem,
        draftItem,
        draftSection,
        editingSectionId,
        editingSelectedSectionTitleId,
        isShortcutHelpOpen,
        keyboardNavigationActive,
        pendingDelete,
        pendingReviewResponse,
        pendingSubmissionResponse,
        pendingValidationMessage,
        selectedSectionId,
    ]);
    const handleSectionDropById = (draggedSectionId: string, targetSectionId: string) => {
        if (isEditorDisabled) return;
        if (!draggedSectionId || !targetSectionId) return;
        if (!canMoveSectionBeforeTarget(sections, draggedSectionId, targetSectionId)) return;
        updateSections((current) =>
            moveSectionBeforeTarget(current, draggedSectionId, targetSectionId)
        );
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        updateDragOverTarget(null);
    };
    const handleSectionDropAfterById = (draggedSectionId: string, targetSectionId: string) => {
        if (isEditorDisabled) return;
        if (!draggedSectionId || !targetSectionId) return;
        if (!canMoveSectionAfterTarget(sections, draggedSectionId, targetSectionId)) return;
        updateSections((current) =>
            moveSectionAfterTarget(current, draggedSectionId, targetSectionId)
        );
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        updateDragOverTarget(null);
    };
    const handleSectionChildDropById = (draggedSectionId: string, parentSectionId: string) => {
        if (isEditorDisabled) return;
        if (draggedSectionId === parentSectionId) return;
        if (!canMoveSectionToParentEnd(sections, draggedSectionId, parentSectionId)) return;
        updateSections((current) =>
            moveSectionToParentEnd(current, draggedSectionId, parentSectionId)
        );
        selectSection(draggedSectionId);
        setCollapsedSectionIds((current) => {
            const next = new Set(current);
            next.delete(parentSectionId);
            return next;
        });
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        updateDragOverTarget(null);
    };
    const handleSectionChildrenEndDropById = (draggedSectionId: string, parentSectionId: string) => {
        if (isEditorDisabled) return;
        if (!canDropSectionAtChildrenEnd(sections, draggedSectionId, parentSectionId)) return;
        updateSections((current) => moveSectionToParentEnd(current, draggedSectionId, parentSectionId));
        selectSection(draggedSectionId);
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        updateDragOverTarget(null);
    };
    const handleItemDrop = (targetItemId: string, placement: "before" | "after") => {
        if (isEditorDisabled) return;
        const currentDraggedItem = draggedItem?.type === "item" ? draggedItem : draggedItemRef.current;
        if (currentDraggedItem?.type !== "item" || currentDraggedItem.sectionId !== selectedSectionId) return;
        updateSections((current) =>
            reorderSectionItems(current, selectedSectionId, currentDraggedItem.id, targetItemId, placement)
        );
        draggedItemRef.current = null;
        setDraggedItem(null);
        updateDragOverTarget(null);
    };
    const getItemDropTargetFromPoint = (clientX: number, clientY: number, draggedItemId: string): DragOverTarget => {
        const element = document.elementFromPoint(clientX, clientY);
        const itemElement = element?.closest?.("[data-item-id]");
        const itemId = itemElement instanceof HTMLElement ? itemElement.dataset.itemId || "" : "";
        if (!itemId || itemId === draggedItemId) return null;
        const rowBounds = itemElement instanceof HTMLElement ? itemElement.getBoundingClientRect() : null;
        const placement = rowBounds && clientY > rowBounds.top + rowBounds.height / 2 ? "after" : "before";
        return { type: "item", id: itemId, placement };
    };
    const getSectionBoundaryDropTargetFromPoint = (clientX: number, clientY: number, draggedSectionId: string): DragOverTarget => {
        const sectionRows = Array.from(document.querySelectorAll<HTMLElement>("[data-section-id]"))
            .map((element) => ({
                element,
                id: element.dataset.sectionId || "",
                bounds: element.getBoundingClientRect(),
            }))
            .filter(({ id, bounds }) =>
                id &&
                id !== draggedSectionId &&
                bounds.width > 0 &&
                bounds.height > 1 &&
                clientX >= bounds.left - 12 &&
                clientX <= bounds.right + 12
            )
            .sort((left, right) => left.bounds.top - right.bounds.top);

        if (!sectionRows.length) return null;

        let previousRow: (typeof sectionRows)[number] | null = null;
        for (const row of sectionRows) {
            if (clientY < row.bounds.top) {
                if (previousRow && canMoveSectionAfterTarget(sections, draggedSectionId, previousRow.id)) {
                    return { type: "section", id: previousRow.id, placement: "after" } as DragOverTarget;
                }
                if (!previousRow && canMoveSectionBeforeTarget(sections, draggedSectionId, row.id)) {
                    return { type: "section", id: row.id, placement: "before" } as DragOverTarget;
                }
                return null;
            }
            if (clientY <= row.bounds.bottom) return null;
            previousRow = row;
        }

        return previousRow && canMoveSectionAfterTarget(sections, draggedSectionId, previousRow.id)
            ? ({ type: "section", id: previousRow.id, placement: "after" } as DragOverTarget)
            : null;
    };
    const getSectionDropTargetFromPoint = (clientX: number, clientY: number, draggedSectionId: string) => {
        const element = document.elementFromPoint(clientX, clientY);
        const sectionChildrenEndElement = element?.closest?.("[data-section-children-end]");
        const childListParentId =
            sectionChildrenEndElement instanceof HTMLElement ? sectionChildrenEndElement.dataset.sectionChildrenEnd || "" : "";
        if (childListParentId && canDropSectionAtChildrenEnd(sections, draggedSectionId, childListParentId)) {
            return { type: "sectionChildrenEnd", parentId: childListParentId } as DragOverTarget;
        }
        const sectionElement = element?.closest?.("[data-section-id]");
        const sectionId = sectionElement instanceof HTMLElement ? sectionElement.dataset.sectionId || "" : "";
        if (!sectionId) return getSectionBoundaryDropTargetFromPoint(clientX, clientY, draggedSectionId);
        if (sectionId === draggedSectionId) return null;
        const depth = sectionElement instanceof HTMLElement ? Number(sectionElement.dataset.sectionDepth || "0") : 0;
        const rowBounds = sectionElement instanceof HTMLElement ? sectionElement.getBoundingClientRect() : null;
        if (!rowBounds || rowBounds.width <= 0 || rowBounds.height <= 1) return null;
        const topNestLimit = rowBounds.top + rowBounds.height * SECTION_NEST_ZONE_RATIO;
        const bottomNestLimit = rowBounds.bottom - rowBounds.height * SECTION_NEST_ZONE_RATIO;
        const isOverTopLevelMiddle = depth === 0 && clientY > topNestLimit && clientY < bottomNestLimit;
        if (isOverTopLevelMiddle) {
            if (canMoveSectionToParentEnd(sections, draggedSectionId, sectionId)) {
                return { type: "section", id: sectionId, placement: "child" } as DragOverTarget;
            }
            return {
                type: "invalidSectionChild",
                id: sectionId,
                reason: getSectionParentDropValidationMessage(sections, draggedSectionId, sectionId),
            } as DragOverTarget;
        }
        return getSectionInsertionTargetFromMidpoint(sections, sectionId, clientY, rowBounds);
    };
    const handleSectionPointerDown = (event: React.PointerEvent<HTMLElement>, section: ChecklistSection) => {
        if (isEditorDisabled) return;
        if (event.button !== 0 || draftSection || draftItem) return;
        const target = event.target as HTMLElement;
        if (target.closest("button,input,textarea,select,[role='button']")) return;
        if (isInSectionDisclosureZone(event, section.sections.length > 0)) return;
        sectionPointerDragRef.current = {
            id: section.id,
            startX: event.clientX,
            startY: event.clientY,
            isDragging: false,
            pointerId: event.pointerId,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleSectionPointerMove = (event: React.PointerEvent<HTMLElement>) => {
        const drag = sectionPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (!drag.isDragging && distance < 6) return;
        if (!drag.isDragging) {
            event.preventDefault();
            window.getSelection?.()?.removeAllRanges();
            drag.isDragging = true;
            ignoreNextSectionClickRef.current = true;
            draggedSectionIdRef.current = drag.id;
            setDraggedItem({ type: "section", id: drag.id });
        }
        const target = getSectionDropTargetFromPoint(event.clientX, event.clientY, drag.id);
        if (target?.type === "sectionChildrenEnd") {
            updateDragOverTarget(target);
            return;
        }
        if (target?.type === "section" && target.placement === "child" && canMoveSectionToParentEnd(sections, drag.id, target.id)) {
            updateDragOverTarget(target);
            return;
        }
        if (target?.type === "invalidSectionChild") {
            updateDragOverTarget(target);
            return;
        }
        if (
            target?.type === "section" &&
            target.placement === "after" &&
            canMoveSectionAfterTarget(sections, drag.id, target.id)
        ) {
            updateDragOverTarget(target);
            return;
        }
        if (target?.type === "section" && canMoveSectionBeforeTarget(sections, drag.id, target.id)) {
            updateDragOverTarget(target);
            return;
        }
        updateDragOverTarget(null);
    };
    const handleSectionPointerUp = (event: React.PointerEvent<HTMLElement>) => {
        const drag = sectionPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // Pointer capture can already be released by the browser.
        }
        const target = drag.isDragging ? getSectionDropTargetFromPoint(event.clientX, event.clientY, drag.id) : null;
        sectionPointerDragRef.current = null;
        draggedSectionIdRef.current = "";
        setDraggedItem(null);
        updateDragOverTarget(null);
        if (!drag.isDragging) return;
        if (target?.type === "sectionChildrenEnd") {
            handleSectionChildrenEndDropById(drag.id, target.parentId);
            return;
        }
        if (target?.type === "invalidSectionChild") {
            setPendingValidationMessage({
                title: "Section cannot be nested",
                message: target.reason,
            });
            return;
        }
        if (target?.type === "section" && target.placement === "child") {
            handleSectionChildDropById(drag.id, target.id);
            return;
        }
        if (target?.type === "section" && target.placement === "after") {
            handleSectionDropAfterById(drag.id, target.id);
            return;
        }
        if (target?.type === "section") handleSectionDropById(drag.id, target.id);
    };
    const handleSectionPointerCancel = (event: React.PointerEvent<HTMLElement>) => {
        const drag = sectionPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        sectionPointerDragRef.current = null;
        draggedSectionIdRef.current = "";
        setDraggedItem(null);
        updateDragOverTarget(null);
    };
    const handleItemPointerDown = (event: React.PointerEvent<HTMLDivElement>, item: ChecklistItem) => {
        if (isEditorDisabled) return;
        if (event.button !== 0 || draftSection || draftItem || !selectedSection) return;
        const target = event.target as HTMLElement;
        if (target.closest("button,input,textarea,select,[role='button']")) return;
        event.preventDefault();
        window.getSelection?.()?.removeAllRanges();
        itemPointerDragRef.current = {
            id: item.id,
            sectionId: selectedSection.id,
            startX: event.clientX,
            startY: event.clientY,
            isDragging: false,
            pointerId: event.pointerId,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleItemPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = itemPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (!drag.isDragging && distance < 6) return;
        if (!drag.isDragging) {
            drag.isDragging = true;
            ignoreNextItemClickRef.current = true;
            const nextDraggedItem: DraggedItem = { type: "item", id: drag.id, sectionId: drag.sectionId };
            draggedItemRef.current = nextDraggedItem;
            setDraggedItem(nextDraggedItem);
        }
        const target = getItemDropTargetFromPoint(event.clientX, event.clientY, drag.id);
        if (target?.type === "item" && canDropItemOnTarget(target.id)) {
            updateDragOverTarget(target);
            return;
        }
        updateDragOverTarget(null);
    };
    const handleItemPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = itemPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // Pointer capture can already be released by the browser.
        }
        const target = drag.isDragging ? getItemDropTargetFromPoint(event.clientX, event.clientY, drag.id) : null;
        itemPointerDragRef.current = null;
        if (target?.type === "item" && target.placement && drag.sectionId === selectedSectionId) {
            handleItemDrop(target.id, target.placement);
            return;
        }
        draggedItemRef.current = null;
        setDraggedItem(null);
        updateDragOverTarget(null);
    };
    const handleItemPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = itemPointerDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        itemPointerDragRef.current = null;
        draggedItemRef.current = null;
        setDraggedItem(null);
        updateDragOverTarget(null);
    };
    const canDropItemOnTarget = (targetItemId: string) => {
        const currentDraggedItem = draggedItem?.type === "item" ? draggedItem : draggedItemRef.current;
        return Boolean(
            currentDraggedItem?.type === "item" &&
            currentDraggedItem.sectionId === selectedSectionId &&
            currentDraggedItem.id !== targetItemId
        );
    };
    const deleteSectionById = (sectionId: string) => {
        const deletedSectionIds = getSectionIds(findSectionById(sections, sectionId));
        const nextHighlightedSectionId = getAdjacentIdAfterRemovingIds(
            visibleSections.map(({ section }) => section),
            sectionId,
            deletedSectionIds
        );
        updateSections((current) => removeSectionById(current, sectionId).sections);
        if (selectedSectionPath.some((candidate) => candidate.id === sectionId)) {
            selectSection(nextHighlightedSectionId);
        } else {
            setHighlightedSectionId((current) => (current === sectionId ? nextHighlightedSectionId : current));
        }
        setKeyboardPane("sections");
    };
    const requestDeleteSection = (section: ChecklistSection) => {
        if (isEditorDisabled) return;
        const totals = countSectionContents(section);
        if (totals.sections === 0 && totals.items === 0) {
            deleteSectionById(section.id);
            return;
        }
        setPendingDelete({
            type: "section",
            id: section.id,
            name: section.name || "Unnamed section",
            sectionCount: totals.sections,
            itemCount: totals.items,
        });
    };
    const requestDeleteItem = (sectionId: string, item: ChecklistItem) => {
        if (isEditorDisabled) return;
        setPendingDelete({
            type: "item",
            sectionId,
            id: item.id,
            name: item.name || "Unnamed item",
        });
    };
    const confirmDelete = () => {
        if (isEditorDisabled) return;
        if (!pendingDelete) return;
        if (pendingDelete.type === "section") {
            deleteSectionById(pendingDelete.id);
        } else {
            const nextSelectedItemId = getAdjacentIdAfterRemoval(selectedSection?.items || [], pendingDelete.id);
            updateSections((current) => removeItemFromSection(current, pendingDelete.sectionId, pendingDelete.id));
            if (draftItem?.itemId === pendingDelete.id) setDraftItem(null);
            if (selectedItemId === pendingDelete.id) setSelectedItemId(nextSelectedItemId);
            setKeyboardPane("items");
        }
        setPendingDelete(null);
    };
    const getDeleteConfirmationMessage = () => {
        if (!pendingDelete) return "";
        if (pendingDelete.type === "item") {
            return `This action will permanently remove "${pendingDelete.name}" from the checklist version.`;
        }
        return `This action will permanently remove "${pendingDelete.name}" and all contained sections and items from the checklist version.`;
    };
    const getSectionCountText = (section: ChecklistSection) => {
        if (section.sections.length) {
            return `${section.sections.length} ${section.sections.length === 1 ? "section" : "sections"}`;
        }
        return `${section.items.length} ${section.items.length === 1 ? "item" : "items"}`;
    };
    const renderDraftSectionRow = (depth = 0) => (
        <div
            className={styles.draftSectionRow}
            style={{ marginLeft: depth * 18 }}
        >
            <Input
                autoFocus
                placeholder="Enter section name"
                value={draftSection?.name || ""}
                disabled={isEditorDisabled}
                onChange={(_, data) =>
                    setDraftSection((current) => current ? { ...current, name: data.value } : current)
                }
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                        confirmDraftSection();
                    }
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        setDraftSection(null);
                    }
                }}
            />
            <Button
                aria-label="Confirm section name"
                appearance="primary"
                icon={<CheckmarkRegular />}
                disabled={isEditorDisabled || !draftSection?.name.trim()}
                onClick={confirmDraftSection}
            />
        </div>
	    );
	    const renderDraftItemRow = () => {
	        const equipmentCategories = identificationOptions[CHECKLIST_TARGET_EQUIPMENT] || [];
	        const selectedEquipmentCategory =
	            findIdentificationTargetGroupById(
	                identificationOptions,
	                CHECKLIST_TARGET_EQUIPMENT,
	                draftItem?.identificationCategoryId || ""
	            ) ||
	            findIdentificationTargetGroupForTargetId(
	                identificationOptions,
	                CHECKLIST_TARGET_EQUIPMENT,
	                draftItem?.identificationTargetId || ""
	            );
	        const selectedEquipmentTypes = selectedEquipmentCategory?.options || [];
	        const selectedEquipmentType =
	            findIdentificationTargetById(
	                identificationOptions,
	                CHECKLIST_TARGET_EQUIPMENT,
	                draftItem?.identificationTargetId || ""
	            ) ||
	            (
	                draftItem?.identificationTarget?.entityName === "int_equipmenttype"
	                    ? draftItem.identificationTarget
	                    : null
	            );
	        const loadedRequiredChecklistOptions = draftItem?.identificationTargetId
	            ? requiredChecklistOptionsByEquipmentType[draftItem.identificationTargetId] || []
	            : [];
		        const savedRequiredChecklistRuns = draftItem?.requiredChecklistRuns || [];
		        const savedRequiredChecklistById = new Map(savedRequiredChecklistRuns.map((checklist) => [checklist.id, checklist]));
		        const requiredChecklistOptions = [
		            ...savedRequiredChecklistRuns.filter((checklist) =>
		                !loadedRequiredChecklistOptions.some((option) => option.id === checklist.id)
		            ),
		            ...loadedRequiredChecklistOptions.map((option) => {
		                const saved = savedRequiredChecklistById.get(option.id);
		                return {
		                    ...option,
		                    required: saved?.required ?? option.required ?? true,
		                    guidance: saved?.guidance ?? option.guidance ?? "",
		                };
		            }),
		        ];
	        const selectedRequiredChecklistRuns = requiredChecklistOptions.filter((checklist) =>
	            draftItem?.requiredChecklistRunIds.includes(checklist.id)
	        );
	        const selectedRequiredChecklistText = selectedRequiredChecklistRuns.map((checklist) => checklist.name).join(", ");
	        const isLoadingRequiredChecklists =
	            Boolean(draftItem?.identificationTargetId) &&
	            loadingRequiredChecklistEquipmentTypeId === draftItem?.identificationTargetId;
	        const selectEquipmentCategory = (categoryId: string) => {
	            setDraftItem((current) =>
	                current
	                    ? {
	                          ...current,
	                          identificationCategoryId: categoryId,
	                          identificationTargetTypeValue: CHECKLIST_TARGET_EQUIPMENT,
	                          identificationTargetId: "",
	                          identificationTarget: null,
	                          requiresChecklistRuns: false,
	                          requiredChecklistRunIds: [],
	                          requiredChecklistRuns: [],
	                      }
	                    : current
	            );
	        };
	        const selectEquipmentType = (targetId: string) => {
	            if (!targetId) return;
	            const selected = findIdentificationTargetById(identificationOptions, CHECKLIST_TARGET_EQUIPMENT, targetId);
	            if (!selected) return;
	            const selectedGroup = findIdentificationTargetGroupForTargetId(
	                identificationOptions,
	                CHECKLIST_TARGET_EQUIPMENT,
	                targetId
	            );
	            setDraftItem((current) =>
	                current
	                    ? {
	                          ...current,
	                          identificationCategoryId: selectedGroup?.id || selected.groupId || current.identificationCategoryId,
	                          identificationTargetTypeValue: CHECKLIST_TARGET_EQUIPMENT,
	                          identificationTargetId: selected.id,
	                          identificationTarget: selected,
	                          requiresChecklistRuns: false,
	                          requiredChecklistRunIds: [],
	                          requiredChecklistRuns: [],
	                      }
	                    : current
	            );
	        };
		        const selectRequiredChecklists = (selectedIds: readonly string[]) => {
		            const selectedIdSet = new Set(selectedIds);
		            setDraftItem((current) =>
		                current
		                    ? {
		                          ...current,
		                          requiredChecklistRunIds: [...selectedIds],
		                          requiredChecklistRuns: requiredChecklistOptions.filter((checklist) =>
		                              selectedIdSet.has(checklist.id)
		                          ).map((checklist) => ({
		                              ...checklist,
		                              required: checklist.required ?? true,
		                              guidance: checklist.guidance || "",
		                          })),
		                      }
		                    : current
		            );
		        };
		        const updateRequiredChecklistRun = (
		            checklistId: string,
		            updates: Partial<Pick<RequiredChecklistRunOption, "required" | "guidance">>
		        ) => {
		            setDraftItem((current) =>
		                current
		                    ? {
		                          ...current,
		                          requiredChecklistRuns: current.requiredChecklistRuns.map((checklist) =>
		                              checklist.id === checklistId
		                                  ? { ...checklist, ...updates }
		                                  : checklist
		                          ),
		                      }
		                    : current
		            );
		        };

        return (
            <div className={styles.itemEditCard}>
                <Field label="Name" className={styles.itemNameField}>
                    <Input
                        autoFocus
                        ref={itemNameInputRef}
                        placeholder="Enter item name"
                        value={draftItem?.name || ""}
                        disabled={isEditorDisabled}
                        onChange={(_, data) =>
                            setDraftItem((current) => current ? { ...current, name: data.value } : current)
                        }
                        onKeyDown={(event) => handleItemEditKeyDown(event)}
                    />
                </Field>
                <Field label="Quantity" className={styles.itemQuantityField}>
                    <Input
                        type="number"
                        min={0}
                        placeholder="Not specified"
                        value={draftItem?.quantity || ""}
                        disabled={isEditorDisabled}
                        onChange={(_, data) =>
                            setDraftItem((current) => current ? { ...current, quantity: data.value } : current)
                        }
                        onKeyDown={(event) => handleItemEditKeyDown(event)}
                    />
                </Field>
                <Field label="Description" className={styles.itemDescriptionField}>
                    <Textarea
                        resize="vertical"
                        rows={3}
                        placeholder="Enter completion guidance, acceptance criteria, or supporting notes"
                        value={draftItem?.description || ""}
                        disabled={isEditorDisabled}
                        onChange={(_, data) =>
                            setDraftItem((current) => current ? { ...current, description: data.value } : current)
                        }
                        onKeyDown={(event) => handleItemEditKeyDown(event)}
                    />
	                </Field>
	                <div className={styles.itemIdentificationField}>
	                    <Tooltip
	                        relationship="description"
	                        content="When enabled, crew members will choose the specific equipment item they are recording a status for during the checklist run."
	                    >
	                        <Checkbox
	                            checked={Boolean(draftItem?.requestItemIdentification)}
	                            label="Requires equipment identification"
	                            disabled={isEditorDisabled}
	                            onChange={(_, data) =>
	                                setDraftItem((current) =>
	                                    current
	                                        ? {
	                                              ...current,
	                                              requestItemIdentification: Boolean(data.checked),
	                                              identificationCategoryId: data.checked ? current.identificationCategoryId : "",
	                                              identificationTargetTypeValue: data.checked ? CHECKLIST_TARGET_EQUIPMENT : null,
	                                              identificationTargetId: data.checked ? current.identificationTargetId : "",
	                                              identificationTarget: data.checked ? current.identificationTarget : null,
	                                              requiresChecklistRuns: data.checked ? current.requiresChecklistRuns : false,
	                                              requiredChecklistRunIds: data.checked ? current.requiredChecklistRunIds : [],
	                                              requiredChecklistRuns: data.checked ? current.requiredChecklistRuns : [],
	                                          }
	                                        : current
	                                )
	                            }
	                        />
	                    </Tooltip>
	                    {draftItem?.requestItemIdentification && (
	                        <div className={styles.itemIdentificationControls}>
	                            <Field label="Equipment category">
	                                <Dropdown
	                                    inlinePopup
	                                    className={styles.controlFullWidth}
	                                    placeholder="Select equipment category"
	                                    selectedOptions={draftItem.identificationCategoryId ? [draftItem.identificationCategoryId] : []}
	                                    value={selectedEquipmentCategory?.name || ""}
	                                    disabled={isEditorDisabled}
	                                    onOptionSelect={(_, data) => {
	                                        selectEquipmentCategory(data.selectedOptions[0] || data.optionValue || "");
	                                    }}
	                                >
	                                    {equipmentCategories.map((category) => (
	                                        <Option
	                                            key={category.id}
	                                            value={category.id}
	                                            text={category.name}
	                                            onClick={() => selectEquipmentCategory(category.id)}
	                                        >
	                                            {category.name}
	                                        </Option>
	                                    ))}
	                                </Dropdown>
	                            </Field>
	                            <Field label="Equipment type">
	                                <Dropdown
	                                    inlinePopup
	                                    className={styles.controlFullWidth}
	                                    placeholder="Select equipment type"
	                                    selectedOptions={draftItem.identificationTargetId ? [draftItem.identificationTargetId] : []}
	                                    value={selectedEquipmentType?.name || ""}
	                                    disabled={isEditorDisabled || !selectedEquipmentCategory}
	                                    onOptionSelect={(_, data) => {
	                                        selectEquipmentType(data.selectedOptions[0] || data.optionValue || "");
	                                    }}
	                                >
	                                    {selectedEquipmentTypes.map((option) => (
	                                        <Option
	                                            key={option.id}
	                                            value={option.id}
	                                            text={option.name}
	                                            onClick={() => selectEquipmentType(option.id)}
	                                        >
	                                            {option.name}
	                                        </Option>
	                                    ))}
	                                </Dropdown>
	                            </Field>
	                            <Checkbox
	                                checked={Boolean(draftItem.requiresChecklistRuns)}
	                                disabled={isEditorDisabled || !selectedEquipmentType}
	                                label="Requires checklist runs"
	                                onChange={(_, data) =>
	                                    setDraftItem((current) =>
	                                        current
	                                            ? {
	                                                  ...current,
	                                                  requiresChecklistRuns: Boolean(data.checked),
	                                                  requiredChecklistRunIds: data.checked ? current.requiredChecklistRunIds : [],
	                                                  requiredChecklistRuns: data.checked ? current.requiredChecklistRuns : [],
	                                              }
	                                            : current
	                                    )
	                                }
	                            />
	                            {draftItem.requiresChecklistRuns && (
	                                <>
	                                    <Field label="Required checklists" style={{ gridColumn: "1 / -1" }}>
	                                        <Dropdown
	                                            inlinePopup
	                                            multiselect
	                                            className={styles.controlFullWidth}
	                                            placeholder={
	                                                isLoadingRequiredChecklists
	                                                    ? "Loading checklists"
	                                                    : requiredChecklistOptions.length === 0
	                                                      ? "No published checklists found"
	                                                      : "Select checklists"
	                                            }
	                                            selectedOptions={draftItem.requiredChecklistRunIds}
	                                            value={selectedRequiredChecklistText}
	                                            disabled={isEditorDisabled || !selectedEquipmentType || isLoadingRequiredChecklists}
	                                            onOptionSelect={(_, data) => {
	                                                selectRequiredChecklists(data.selectedOptions);
	                                            }}
	                                        >
	                                            {requiredChecklistOptions.map((option) => (
	                                                <Option
	                                                    key={option.id}
	                                                    value={option.id}
	                                                    text={option.name}
	                                                >
	                                                    {option.versionNumber ? `${option.name} v${option.versionNumber}` : option.name}
	                                                </Option>
	                                            ))}
	                                            {!isLoadingRequiredChecklists && requiredChecklistOptions.length === 0 && (
	                                                <Option key="no-published-checklists" value="no-published-checklists" disabled>
	                                                    No published checklists found
	                                                </Option>
	                                            )}
	                                        </Dropdown>
	                                    </Field>
	                                    {selectedRequiredChecklistRuns.length > 0 && (
	                                        <div className={styles.requiredChecklistRunList}>
	                                            {selectedRequiredChecklistRuns.map((checklist) => {
	                                                const isRequired = checklist.required ?? true;
	                                                return (
	                                                    <div key={checklist.id} className={styles.requiredChecklistRunRow}>
	                                                        <div className={styles.requiredChecklistRunName}>
	                                                            <Text weight="semibold">
	                                                                {checklist.versionNumber
	                                                                    ? `${checklist.name} v${checklist.versionNumber}`
	                                                                    : checklist.name}
	                                                            </Text>
	                                                        </div>
	                                                        <Checkbox
	                                                            checked={isRequired}
	                                                            label="Required"
	                                                            disabled={isEditorDisabled}
	                                                            onChange={(_, data) =>
	                                                                updateRequiredChecklistRun(checklist.id, {
	                                                                    required: Boolean(data.checked),
	                                                                })
	                                                            }
	                                                        />
	                                                        {!isRequired && (
	                                                            <Textarea
	                                                                className={styles.requiredChecklistRunGuidance}
	                                                                resize="vertical"
	                                                                rows={2}
	                                                                placeholder="When should this checklist be completed?"
	                                                                value={checklist.guidance || ""}
	                                                                disabled={isEditorDisabled}
	                                                                onChange={(_, data) =>
	                                                                    updateRequiredChecklistRun(checklist.id, {
	                                                                        guidance: data.value,
	                                                                    })
	                                                                }
	                                                            />
	                                                        )}
	                                                    </div>
	                                                );
	                                            })}
	                                        </div>
	                                    )}
	                                </>
	                            )}
	                        </div>
	                    )}
	                </div>
                <Button
                    aria-label="Confirm item details"
                    appearance="primary"
                    className={styles.itemConfirmButton}
                    icon={<CheckmarkRegular />}
                    disabled={
                        isEditorDisabled ||
                        !draftItem?.name.trim() ||
                        Boolean(
	                            draftItem.requestItemIdentification &&
	                            (
	                                !draftItem.identificationCategoryId ||
	                                !draftItem.identificationTargetId ||
	                                (draftItem.requiresChecklistRuns && draftItem.requiredChecklistRunIds.length === 0)
	                            )
	                        )
	                    }
                    onClick={() => confirmDraftItem()}
                />
            </div>
        );
    };
    const renderSectionRow = (section: ChecklistSection, depth = 0): React.ReactNode => {
        const hasChildren = section.sections.length > 0;
        const hasPendingChildDraft = draftSection?.parentId === section.id;
        const hasBranchChildren = hasChildren || hasPendingChildDraft;
        const isCollapsed = collapsedSectionIds.has(section.id);
        const isSelectedSection = selectedSectionId === section.id;
        const isHighlightedSection =
            showEditHoverActions &&
            keyboardNavigationActive &&
            keyboardPane === "sections" &&
            !focusedSectionAction &&
            highlightedSectionId === section.id;
        const isEditingThisSection = editingSectionId === section.id;
        const isSelectedAncestorSection =
            depth === 0 &&
            selectedSectionPath.length > 1 &&
            selectedSectionPath[0]?.id === section.id;
        const isDropBeforeTarget =
            dragOverTarget?.type === "section" &&
            dragOverTarget.id === section.id &&
            (dragOverTarget.placement || "before") === "before";
        const isDropAfterTarget =
            dragOverTarget?.type === "section" &&
            dragOverTarget.id === section.id &&
            dragOverTarget.placement === "after";
        const isDropChildTarget =
            dragOverTarget?.type === "section" &&
            dragOverTarget.id === section.id &&
            dragOverTarget.placement === "child";
        const isInvalidDropTarget =
            dragOverTarget?.type === "invalidSectionChild" &&
            dragOverTarget.id === section.id;
        const cannotNestWhileDragging = Boolean(
            draggedItem?.type === "section" &&
            draggedItem.id !== section.id &&
            !canMoveSectionToParentEnd(sections, draggedItem.id, section.id)
        );
        const shouldMuteSectionAsInvalidNestTarget = cannotNestWhileDragging || isInvalidDropTarget;
        const isAnyDropTarget = isDropBeforeTarget || isDropAfterTarget || isDropChildTarget || isInvalidDropTarget;
        const canUseHoverBackground = showEditHoverActions && !isSelectedSection && !isHighlightedSection && !isAnyDropTarget;
        const selectedSectionStyle: React.CSSProperties | undefined =
            isSelectedSection && !isAnyDropTarget
                ? {
                      backgroundColor: tokens.colorBrandBackground2,
                      color: tokens.colorNeutralForeground1,
                  }
                : isHighlightedSection && !isAnyDropTarget
                ? {
                      color: tokens.colorNeutralForeground1,
                  }
                : undefined;
        const canDropAtChildrenEnd = Boolean(
            draggedItem?.type === "section" && canDropSectionAtChildrenEnd(sections, draggedItem.id, section.id)
        );
        const canAddAnotherChild =
            showAddContentActions &&
            depth === 0 &&
            section.sections.length > 0 &&
            !isCollapsed;
        const isEmptySection = section.sections.length === 0 && section.items.length === 0 && !hasPendingChildDraft;
        const openChildSectionIds = !isCollapsed
            ? getOpenSiblingSectionIds(section.sections, collapsedSectionIds)
            : [];

        return (
            <React.Fragment key={section.id}>
                <TreeItem
                    itemType={hasBranchChildren ? "branch" : "leaf"}
                    value={section.id}
                    className={styles.sectionTreeItem}
                >
                    <TreeItemLayout
                        data-section-id={section.id}
                        data-section-depth={depth}
                        aria-describedby={sectionActionsDescriptionId}
                        aria-selected={isSelectedSection}
                        className={[
                            styles.sectionTreeItemLayout,
                            styles.sectionRow,
                            canUseHoverBackground ? styles.sectionRowHoverable : "",
                            depth === 0 ? styles.parentSectionRow : styles.childSectionRow,
                            isSelectedAncestorSection ? styles.selectedAncestorSectionRow : "",
                            isSelectedSection ? styles.selectedSectionRow : "",
                            isHighlightedSection ? styles.keyboardFocusRow : "",
                            isSelectedSection && depth > 0 ? styles.selectedChildSectionRow : "",
                            draggedItem?.type === "section" ? styles.sectionDraggingCursor : "",
                            draggedItem?.type === "section" && draggedItem.id === section.id ? styles.draggingRow : "",
                            isDropChildTarget ? styles.dropIntoSectionRow : "",
                            isInvalidDropTarget ? styles.invalidDropSectionRow : "",
                        ].filter(Boolean).join(" ")}
                        style={selectedSectionStyle}
                        onClick={(event) => {
                            if (isEditingThisSection) return;
                            if (isInSectionDisclosureZone(event, hasBranchChildren)) return;
                            if (ignoreNextSectionClickRef.current) {
                                ignoreNextSectionClickRef.current = false;
                                return;
                            }
                            selectSectionPane(section.id);
                            setDraftItem(null);
                        }}
                        onPointerDown={(event) => handleSectionPointerDown(event, section)}
                        onPointerMove={handleSectionPointerMove}
                        onPointerUp={handleSectionPointerUp}
                        onPointerCancel={handleSectionPointerCancel}
                        onPointerEnter={() => {
                            if (showEditHoverActions) setHoveredSectionId(section.id);
                        }}
                        onPointerLeave={() => {
                            setHoveredSectionId((currentId) => (currentId === section.id ? "" : currentId));
                        }}
                        actions={
                            <div className={styles.rowActions} {...sectionActionNavigation}>
                                <span className={styles.sectionCountText}>
                                    {getSectionCountText(section)}
                                </span>
                                <Button
                                    aria-label="Edit section name"
                                    appearance="subtle"
                                    className={styles.sectionEditButton}
                                    icon={<EditRegular />}
                                    style={{ visibility: showEditHoverActions && hoveredSectionId === section.id && !isEditingThisSection ? "visible" : "hidden" }}
                                    disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        startEditSectionName(section);
                                    }}
                                />
                                <Button
                                    aria-label="Delete section"
                                    appearance="subtle"
                                    className={styles.sectionDeleteButton}
                                    icon={<DeleteRegular />}
                                    style={{ visibility: showEditHoverActions && hoveredSectionId === section.id ? "visible" : "hidden" }}
                                    disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        requestDeleteSection(section);
                                    }}
                                />
                            </div>
                        }
                    >
                        <div className={styles.sectionMain}>
                            {isEditingThisSection ? (
                                <div
                                    className={styles.sectionNameEditRow}
                                    onClick={(event) => event.stopPropagation()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                >
                                    <Input
                                        autoFocus
                                        className={styles.sectionNameInlineInput}
                                        value={sectionNameDraft}
                                        disabled={isEditorDisabled}
                                        onChange={(_, data) => setSectionNameDraft(data.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                confirmEditingSectionName();
                                            }
                                            if (event.key === "Escape") {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setEditingSectionId("");
                                            }
                                        }}
                                        onBlur={confirmEditingSectionName}
                                    />
                                    <Button
                                        aria-label="Confirm section name"
                                        appearance="primary"
                                        className={styles.sectionNameConfirmButton}
                                        icon={<CheckmarkRegular />}
                                        disabled={isEditorDisabled || !sectionNameDraft.trim()}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            confirmEditingSectionName();
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <span className={styles.sectionTitleCluster}>
                                        <Text
                                            className={[
                                                styles.sectionRowText,
                                                isDropChildTarget ? styles.sectionNestTargetText : "",
                                                shouldMuteSectionAsInvalidNestTarget ? styles.sectionInvalidNestTargetText : "",
                                            ].filter(Boolean).join(" ")}
                                            style={
                                                shouldMuteSectionAsInvalidNestTarget
                                                    ? {
                                                          color: tokens.colorNeutralForegroundDisabled,
                                                          textDecorationLine: "line-through",
                                                          textDecorationThickness: "1px",
                                                      }
                                                    : undefined
                                            }
                                            weight={depth === 0 || isSelectedSection || isDropChildTarget || shouldMuteSectionAsInvalidNestTarget ? "semibold" : "regular"}
                                        >
                                            {section.name || "Unnamed section"}
                                        </Text>
                                        {section.bulkServiceable && (
                                            <span className={styles.sectionBulkPill}>Bulk check</span>
                                        )}
                                        {isEmptySection && (
                                            <span
                                                aria-label="Empty section"
                                                className={styles.sectionWarningPill}
                                                title="Empty section"
                                            >
                                                <WarningRegular />
                                                Empty
                                            </span>
                                        )}
                                    </span>
                                </>
                            )}
                        </div>
                        {isHighlightedSection && <span className={styles.keyboardFocusOverlay} />}
                    </TreeItemLayout>
                    {hasBranchChildren && !isCollapsed && (
                        <>
                            {hasChildren && (
                                <Tree
                                    aria-label={`${section.name || "Unnamed section"} child sections`}
                                    className={styles.sectionChildren}
                                    openItems={openChildSectionIds}
                                    onOpenChange={handleSectionTreeOpenChange}
                                >
                                    {section.sections.map((childSection, index) => (
                                        <React.Fragment key={childSection.id}>
                                            {index > 0 && <div className={styles.childSectionDivider} />}
                                            {renderSectionRow(childSection, depth + 1)}
                                            {draftSection?.parentId === section.id &&
                                                draftSection.afterSectionId === childSection.id &&
                                                renderDraftSectionRow(depth + 1)}
                                        </React.Fragment>
                                    ))}
                                    {canDropAtChildrenEnd && (
                                        <div
                                            data-section-children-end={section.id}
                                            className={[
                                                styles.topLevelEndDropTarget,
                                                dragOverTarget?.type === "sectionChildrenEnd" && dragOverTarget.parentId === section.id
                                                    ? styles.activeSectionChildrenEndDropTarget
                                                    : "",
                                            ].filter(Boolean).join(" ")}
                                        />
                                    )}
                                </Tree>
                            )}
                            {draftSection?.parentId === section.id && !draftSection.afterSectionId && (
                                <div
                                    className={[
                                        hasChildren ? styles.sectionChildrenEndDraft : styles.sectionChildren,
                                        !hasChildren ? styles.sectionChildrenEndDraft : "",
                                    ].filter(Boolean).join(" ")}
                                >
                                    {renderDraftSectionRow(depth + 1)}
                                </div>
                            )}
                            {canAddAnotherChild && (
                                <div className={[styles.sectionAddAnotherRow, styles.sectionChildrenEndActions].join(" ")}>
                                    <Button
                                        appearance="subtle"
                                        icon={<AddRegular />}
                                        className={[
                                            styles.sectionAddAnotherButton,
                                            keyboardNavigationActive &&
                                            focusedSectionAction?.type === "addChildSection" &&
                                            focusedSectionAction.sectionId === section.id
                                                ? styles.keyboardActionFocus
                                                : "",
                                        ].filter(Boolean).join(" ")}
                                        style={getAddActionFocusStyle(
                                            (
                                                keyboardNavigationActive &&
                                                focusedSectionAction?.type === "addChildSection" &&
                                                focusedSectionAction.sectionId === section.id
                                            ) ||
                                            focusedAddButtonKey === `add-child-section-${section.id}`
                                        )}
                                        disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onFocus={() => {
                                            setKeyboardNavigationActive(true);
                                            setKeyboardPane("sections");
                                            setFocusedSectionAction({ type: "addChildSection", sectionId: section.id });
                                            setFocusedItemAction(null);
                                            setFocusedAddButtonKey(`add-child-section-${section.id}`);
                                            scheduleKeyboardFocusReset();
                                        }}
                                        onBlur={() => setFocusedAddButtonKey("")}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            startNewSection(section.id);
                                        }}
                                    >
                                        Add a child section
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </TreeItem>
            </React.Fragment>
        );
    };
    const resetEditorChanges = () => {
        const details = version.definition.checklistVersionDetails;
        const initialSections = version.definition.checklistVersionContents.sections;
        const initialSectionId = flattenSections(initialSections)[0]?.section.id || "";

        setChecklistName(details.checklistName || checklist.name);
        setVersionType(version.versionType || details.versionType || VERSION_TYPE_MINOR);
        setVersionNumber(version.versionNumber || details.versionNumber || "");
        setDescription(version.description || details.description || "");
        setAppliesTo(details.appliesTo);
        setOptions(details.options);
        setSections(initialSections);
        setSelectedSectionId(initialSectionId);
        setHighlightedSectionId(initialSectionId);
        setSelectedItemId("");
        setKeyboardPane("sections");
        setKeyboardNavigationActive(false);
        setIsShortcutHelpOpen(false);
        setDraftSection(null);
        setDraftItem(null);
        setEditingSectionId("");
        setSectionNameDraft("");
        setDraggedItem(null);
        draggedSectionIdRef.current = "";
        draggedItemRef.current = null;
        sectionPointerDragRef.current = null;
        itemPointerDragRef.current = null;
        ignoreNextSectionClickRef.current = false;
        ignoreNextItemClickRef.current = false;
        updateDragOverTarget(null);
        setPendingDelete(null);
        setPendingValidationMessage(null);
        setPendingReviewResponse(null);
        setPendingSubmissionResponse(null);
        setHoveredSectionId("");
        setHoveredItemId("");
        setCollapsedSectionIds(new Set(getSectionIdsWithChildren(initialSections)));
        setSaveError("");
        setHasDefinitionChanges(false);
    };
    const handleSave = async () => {
        if (isEditorDisabled) return;
        setSaveError("");
        setIsSaving(true);
        try {
            const saved = await saveChecklistVersionDefinition(version, currentDefinition);
            onVersionSaved(saved);
            setHasDefinitionChanges(false);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "The checklist version could not be saved.");
        } finally {
            setIsSaving(false);
        }
    };
    const versionActionIcon = requiresChecklistVersionReview ? <SendRegular /> : <CheckmarkRegular />;
    const renderVersionActionButton = () => (
        <Tooltip
            relationship="description"
            content={isVersionActionDisabled ? versionActionDisabledReason || "This action is not currently available." : versionActionDescription}
        >
            <span>
                <Button
                    appearance="primary"
                    className={requiresChecklistVersionReview ? undefined : styles.publishButton}
                    icon={versionActionIcon}
                    disabled={isVersionActionDisabled}
                    onClick={handleSubmitForApproval}
                >
                    {versionActionLabel}
                </Button>
            </span>
        </Tooltip>
    );
    const buildSubmissionPayload = (comments = ""): ChecklistVersionSubmissionPayload => ({
        submissionComments: comments.trim(),
    });
    const reloadChecklistVersion = async () => {
        if (!version.id) return;
        const refreshedVersion = await loadChecklistVersionFromDataverse(version.id);
        if (refreshedVersion) {
            onVersionSaved(refreshedVersion);
            setHasDefinitionChanges(false);
        }
    };
    const runWorkflowAction = async (
        action: () => Promise<ChecklistVersionCustomApiResponse>,
        fallbackMessage: string
    ) => {
        if (isWorkflowActionRunning) return;
        setSaveError("");
        setIsWorkflowActionRunning(true);
        try {
            const response = await action();
            setPendingSubmissionResponse(null);
            setPendingReviewResponse(null);
            showShortcutNotice(response.Message || fallbackMessage);
            await reloadChecklistVersion();
        } catch (error) {
            setSaveError(getErrorMessage(error) || "The Dataverse action could not be completed.");
        } finally {
            setIsWorkflowActionRunning(false);
        }
    };
    const submitChecklistVersionForReview = (payload: ChecklistVersionSubmissionPayload) =>
        runWorkflowAction(
            () => submitOrPublishDraftChecklistVersion(version.id || "", payload),
            requiresChecklistVersionReview
                ? "Checklist version submitted for approval."
                : "Checklist version published."
        );
    const handleSubmitForApproval = () => {
        if (!canSubmitForApproval || isWorkflowActionRunning) return;
        setPendingSubmissionResponse({ comments: "" });
    };
    const confirmSubmissionResponse = () => {
        submitChecklistVersionForReview(buildSubmissionPayload(pendingSubmissionResponse?.comments || ""));
    };
    const buildReviewPayload = (outcome: ChecklistVersionReviewOutcome, reason = ""): ChecklistVersionReviewPayload => ({
        outcome,
        reason: reason.trim(),
    });
    const submitChecklistVersionReviewResponse = (payload: ChecklistVersionReviewPayload) =>
        runWorkflowAction(
            () => approveChecklistVersionForPublishing(version.id || "", payload),
            `${getReviewOutcomeLabel(payload.outcome)} action completed.`
        );
    const requestReviewResponse = (outcome: ChecklistVersionReviewOutcome) => {
        if (!canRespondToReview || isWorkflowActionRunning) return;
        if (outcome === "approve") {
            submitChecklistVersionReviewResponse(buildReviewPayload(outcome));
            return;
        }
        setPendingReviewResponse({ outcome, reason: "" });
    };
    const confirmReviewResponse = () => {
        if (!pendingReviewResponse || !pendingReviewResponse.reason.trim()) return;
        submitChecklistVersionReviewResponse(
            buildReviewPayload(pendingReviewResponse.outcome, pendingReviewResponse.reason)
        );
    };
    const sectionCount = flattenedSections.length;
    const timelineEntries = version.history;
    const includeNaCompletionOption = Boolean(
        options.find((option) => option.key === "enableNaItemStatusOption")?.value
    );
    const completionOptionLabels = includeNaCompletionOption
        ? ["Fail", "Warning", "Pass", "N/A"]
        : ["Fail", "Warning", "Pass"];
    const getCompletionOptionClassName = (label: string) => [
        styles.printCompletionOption,
        label === "Fail" ? styles.printCompletionOptionFail : "",
        label === "Warning" ? styles.printCompletionOptionWarning : "",
        label === "Pass" ? styles.printCompletionOptionPass : "",
        label === "N/A" ? styles.printCompletionOptionNa : "",
    ].filter(Boolean).join(" ");
    const escapePrintHtml = (value: unknown) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    const renderCompletionOptionsHtml = () => `
        <div class="response-options">
            ${completionOptionLabels.map((label) => `<span class="response-option response-${label === "N/A" ? "na" : label.toLowerCase()}">${escapePrintHtml(label)}</span>`).join("")}
        </div>
    `;
    const renderPrintableSectionHtml = (section: ChecklistSection, depth = 0): string => {
        const hasChildren = section.sections.length > 0;
        const itemCount = section.items.length;
        const sectionPresentation = getPrintableSectionPresentation(section, depth);
        const itemHtml = section.items.map((item) => {
            const itemMeta = getPrintableItemMeta(item);

            return `
                <div class="item">
                    <div class="item-definition">
                        <div class="item-title">${escapePrintHtml(item.name || "Unnamed item")}</div>
                        ${item.description ? `<div class="item-description">${escapePrintHtml(item.description)}</div>` : ""}
                        ${itemMeta ? `<div class="item-meta">${escapePrintHtml(itemMeta)}</div>` : ""}
                    </div>
                    <div class="outcome-panel">
                        <div class="outcome-row">
                            <div class="outcome-title">Outcome</div>
                            ${renderCompletionOptionsHtml()}
                        </div>
                        <div class="comments-box">Comments</div>
                    </div>
                </div>
            `;
        }).join("");
        const childHtml = section.sections.map((childSection) => renderPrintableSectionHtml(childSection, depth + 1)).join("");
        const emptyHtml = !hasChildren && itemCount === 0
            ? `<div class="empty-state">No items have been defined for this section.</div>`
            : "";

        return `
            <section class="section" style="margin-left: ${depth === 0 ? 0 : 10}px;">
                <div class="section-header" style="background-color: ${sectionPresentation.shade}; border-left-color: ${sectionPresentation.accent};">
                    <h2>${escapePrintHtml(section.name || "Unnamed section")}</h2>
                    <span>${escapePrintHtml(sectionPresentation.meta)}</span>
                </div>
                ${itemHtml ? `<div class="items">${itemHtml}</div>` : ""}
                ${childHtml ? `<div class="section-children">${childHtml}</div>` : ""}
                ${emptyHtml}
            </section>
        `;
    };
    const buildPrintableContentsHtml = () => {
        const title = checklistName || checklist.name;
        const statusLabel = version.statusLabel || statusOptions[version.statuscode]?.text || "";
        const printedOn = new Date().toLocaleDateString();
        const sectionsHtml = sections.length
            ? sections.map((section) => renderPrintableSectionHtml(section)).join("")
            : `<div class="empty-state">No sections have been defined.</div>`;

        return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapePrintHtml(title)} contents</title>
<style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    html, body {
        width: auto;
        height: auto;
        min-height: auto;
        max-height: none;
        margin: 0;
        overflow: visible;
        color: #111;
        background: #fff;
        font-family: Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.35;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .print-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        padding-bottom: 12px;
        margin-bottom: 14px;
        border-bottom: 1px solid #bbb;
        break-after: avoid;
    }
    h1 {
        margin: 0 0 5px;
        font-size: 18pt;
        line-height: 1.2;
    }
    .subtitle {
        margin: 0;
        color: #444;
        font-size: 9pt;
    }
    .meta {
        color: #444;
        font-size: 9pt;
        text-align: right;
        white-space: nowrap;
    }
    .section {
        margin-bottom: 12px;
        break-inside: auto;
        page-break-inside: auto;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 12px;
        border: 1px solid #d6dbe5;
        border-left: 4px solid #2563eb;
        border-radius: 4px;
        background: #eef4ff;
        break-after: avoid;
    }
    .section-header h2 {
        margin: 0;
        font-size: 11pt;
        line-height: 1.25;
    }
    .section-header span {
        color: #4b5563;
        font-size: 8.5pt;
        white-space: nowrap;
    }
    .section-children {
        margin-top: 8px;
        padding-left: 14px;
        border-left: 1px solid #dbeafe;
    }
    .items {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 8px;
    }
    .item {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 10px 11px;
        border: 1px solid #e1e5ec;
        border-radius: 4px;
        background: #fff;
        break-inside: avoid;
        page-break-inside: avoid;
    }
    .item-definition {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }
    .item-title {
        color: #111827;
        font-weight: 700;
    }
    .item-description {
        margin-top: 2px;
        color: #374151;
        white-space: pre-wrap;
    }
    .item-meta {
        color: #6b7280;
        font-size: 8.5pt;
        text-align: left;
        white-space: normal;
    }
    .outcome-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        padding: 9px 10px;
        border: 1px solid #dbeafe;
        border-radius: 4px;
        background: #f8fbff;
    }
    .outcome-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
    }
    .outcome-title {
        color: #2563eb;
        font-size: 7.5pt;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
    }
    .response-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-start;
        align-items: center;
    }
    .response-option {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 5px;
        min-width: auto;
        color: #222;
        font-size: 8.5pt;
        white-space: nowrap;
    }
    .response-option::before {
        content: "";
        width: 11px;
        height: 11px;
        border: 1px solid #555;
        border-radius: 2px;
        background: #fff;
    }
    .response-fail {
        color: #7f1d1d;
    }
    .response-fail::before {
        border-color: #dc2626;
        background: #fee2e2;
    }
    .response-warning {
        color: #7c2d12;
    }
    .response-warning::before {
        border-color: #f97316;
        background: #ffedd5;
    }
    .response-pass {
        color: #14532d;
    }
    .response-pass::before {
        border-color: #16a34a;
        background: #dcfce7;
    }
    .response-na {
        color: #4b5563;
    }
    .response-na::before {
        border-color: #9ca3af;
        background: #f3f4f6;
    }
    .comments-box {
        min-height: 54px;
        padding: 8px 10px;
        color: #d1d5db;
        font-size: 8.5pt;
        border: 1px solid #dbe1ea;
        border-radius: 3px;
        background: #fff;
    }
    .empty-state {
        margin-top: 6px;
        color: #555;
        font-style: italic;
    }
</style>
</head>
<body>
    <div class="print-header">
        <div>
            <h1>${escapePrintHtml(title)}</h1>
            <p class="subtitle">Contents | ${escapePrintHtml(t("version"))}: ${escapePrintHtml(formatVersionNumber(versionNumber) || "-")}</p>
            ${description ? `<p class="subtitle">${escapePrintHtml(description)}</p>` : ""}
        </div>
        <div class="meta">
            <div>${escapePrintHtml(statusLabel)}</div>
            <div>${escapePrintHtml(printedOn)}</div>
        </div>
    </div>
    ${sectionsHtml}
</body>
</html>`;
    };
    const printContentsDocument = () => {
        const printFrame = document.createElement("iframe");
        printFrame.setAttribute("title", "Checklist contents print preview");
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        printFrame.style.visibility = "hidden";
        document.body.appendChild(printFrame);
        printFrame.contentDocument?.open();
        printFrame.contentDocument?.write(buildPrintableContentsHtml());
        printFrame.contentDocument?.close();
        window.setTimeout(() => {
            const frameWindow = printFrame.contentWindow;
            if (!frameWindow) return;
            const cleanup = () => {
                window.setTimeout(() => printFrame.remove(), 0);
            };
            frameWindow.onafterprint = cleanup;
            frameWindow.focus();
            frameWindow.print();
            window.setTimeout(cleanup, 60_000);
        }, 0);
    };
    const handlePrintContents = () => {
        setActiveTab("contents");
        window.setTimeout(printContentsDocument, 0);
    };
    const renderPrintableSection = (section: ChecklistSection, depth = 0): React.ReactNode => {
        const hasChildren = section.sections.length > 0;
        const itemCount = section.items.length;
        const sectionPresentation = getPrintableSectionPresentation(section, depth);

        return (
            <section
                key={section.id}
                className={styles.printSection}
                style={{ marginLeft: depth === 0 ? 0 : 10 }}
            >
                <div
                    className={styles.printSectionHeader}
                    style={{
                        backgroundColor: sectionPresentation.shade,
                        borderLeftColor: sectionPresentation.accent,
                    }}
                >
                    <h2 className={styles.printSectionTitle}>{section.name || "Unnamed section"}</h2>
                    {sectionPresentation.meta && <span className={styles.printSectionMeta}>{sectionPresentation.meta}</span>}
                </div>
                {itemCount > 0 && (
                    <div className={styles.printItems}>
                        {section.items.map((item) => {
                            const itemMeta = getPrintableItemMeta(item);

                            return (
                                <div key={item.id} className={styles.printItem}>
                                    <div className={styles.printItemDefinition}>
                                        <div className={styles.printItemTitle}>{item.name || "Unnamed item"}</div>
                                        {item.description && (
                                            <div className={styles.printItemDescription}>{item.description}</div>
                                        )}
                                        {itemMeta && <div className={styles.printItemMeta}>{itemMeta}</div>}
                                    </div>
                                    <div className={styles.printOutcomePanel}>
                                        <div className={styles.printOutcomeRow}>
                                            <div className={styles.printOutcomeTitle}>Outcome</div>
                                            <div className={styles.printCompletionOptions}>
                                                {completionOptionLabels.map((label) => (
                                                    <span key={label} className={getCompletionOptionClassName(label)}>{label}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.printCommentsBox}>Comments</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {hasChildren ? (
                    <div className={styles.printSectionChildren}>
                        {section.sections.map((childSection) => renderPrintableSection(childSection, depth + 1))}
                    </div>
                ) : itemCount === 0 && (
                    <div className={styles.printEmptyState}>No items have been defined for this section.</div>
                )}
            </section>
        );
    };
    const handleTabSelect = (_: any, data: any) => {
        const nextTab = String(data.value);
        if (nextTab === "approvalHistory" && !canShowApprovalHistory) return;
        setActiveTab(nextTab);
        if (nextTab === "contents") {
            focusSectionsPaneForContentTab();
            window.setTimeout(() => contentsPanelRef.current?.focus(), 0);
        } else {
            setKeyboardNavigationActive(false);
            setFocusedSectionAction(null);
            setFocusedItemAction(null);
        }
    };
    const clearTabFocus = (event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
        event.currentTarget.blur();
    };
    const handleContentTabFocus = (event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
        clearTabFocus(event);
        if (activeTab === "contents") {
            focusSectionsPaneForContentTab();
            window.setTimeout(() => contentsPanelRef.current?.focus(), 0);
        }
    };
    const handleContentsPanelKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== "Tab") return;
        if (activeTab !== "contents" || isEditorDisabled) return;
        if (isEditableKeyboardTarget(event.target)) return;
        if (draftSection || draftItem || editingSectionId || editingSelectedSectionTitleId) return;

        event.preventDefault();
        event.stopPropagation();
        switchContentsKeyboardPane();
    };
    const handleContentsPanelFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) return;
        clearKeyboardFocusResetTimer();
        if (event.target instanceof HTMLElement && event.target.closest("button,[role='button']")) return;
        clearKeyboardFocusMode();
    };

    return (
        <div className={styles.detailsPage}>
            {shortcutNotice && (
                <div className={`${styles.shortcutToast} ${styles.noPrint}`}>
                    <Text>{shortcutNotice}</Text>
                </div>
            )}
            {!useCompactVersionHeader && (
                <div className={`${styles.editorHeader} ${styles.noPrint}`}>
                    <div className={styles.titleStack}>
                        <div className={styles.editableTitleRow}>
                            <Text as="h1" className={styles.pageTitle}>
                                {checklistName || checklist.name}
                            </Text>
                            <StatusPill
                                statuscode={version.statuscode}
                                fallbackLabel={version.statusLabel}
                                statusOptions={statusOptions}
                                className={`${styles.statusPill} ${styles.headerStatusPill}`}
                            />
                        </div>
                        <div className={styles.titleMetadataRow}>
                            <Caption1 className={styles.pageSubtitle}>
                                {`${t("version")}: ${formatVersionNumber(versionNumber) || "-"}`}
                            </Caption1>
                        </div>
                    </div>
                    <div className={styles.headerAction}>
                        <ChecklistVersionActionGroup
                            canRespondToReview={canRespondToReview}
                            isWorkflowActionRunning={isWorkflowActionRunning}
                            canShowSubmitForApproval={canShowVersionAction}
                            submitActionButton={renderVersionActionButton()}
                            styles={styles}
                            onReviewResponse={requestReviewResponse}
                        />
                    </div>
                </div>
            )}
            {saveError && (
                <MessageBar intent="error" className={styles.noPrint}>
                    <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
            )}
            {requiresAmendments && (
                <MessageBar intent="warning" layout="multiline" className={styles.noPrint}>
                    <MessageBarBody>
                        <div className={styles.amendmentMessageBody}>
                            <Text className={styles.amendmentMessageTitle}>Requires amendments:</Text>
                            {reviewerComments && (
                                <Text className={styles.amendmentMessageComments}>
                                    {reviewerComments}
                                </Text>
                            )}
                        </div>
                    </MessageBarBody>
                </MessageBar>
            )}
            <div className={styles.printContentsDocument} aria-hidden={activeTab !== "contents"}>
                <div className={styles.printHeader}>
                    <div>
                        <h1 className={styles.printTitle}>{checklistName || checklist.name}</h1>
                        <p className={styles.printSubtitle}>
                            {`Contents | ${t("version")}: ${formatVersionNumber(versionNumber) || "-"}`}
                        </p>
                        {description && <p className={styles.printSubtitle}>{description}</p>}
                    </div>
                    <div className={styles.printMeta}>
                        <div>{version.statusLabel || statusOptions[version.statuscode]?.text || ""}</div>
                        <div>{new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                {sections.length ? (
                    sections.map((section) => renderPrintableSection(section))
                ) : (
                    <div className={styles.printEmptyState}>No sections have been defined.</div>
                )}
            </div>
            <div className={`${styles.tabSurface} ${styles.noPrint}`}>
                <div className={styles.tabHeader}>
                    <TabList
                        selectedValue={activeTab}
                        onTabSelect={handleTabSelect}
                    >
                        <Tab className={styles.tabLabel} value="general" onFocus={clearTabFocus} onClick={clearTabFocus}>General</Tab>
                        <Tab className={styles.tabLabel} value="contents" onFocus={handleContentTabFocus} onClick={handleContentTabFocus}>Contents</Tab>
                        <Tab className={styles.tabLabel} value="options" onFocus={clearTabFocus} onClick={clearTabFocus}>Options</Tab>
                        {canShowApprovalHistory && (
                            <Tab className={styles.tabLabel} value="approvalHistory" onFocus={clearTabFocus} onClick={clearTabFocus}>Approval History</Tab>
                        )}
                    </TabList>
                    <div className={styles.tabActions}>
                        {activeTab === "contents" && (
                            <Button
                                appearance="secondary"
                                icon={<PrintRegular />}
                                onClick={handlePrintContents}
                            >
                                Print
                            </Button>
                        )}
                        {useCompactVersionHeader && canRespondToReview && (
                            <ReviewActionButtons
                                disabled={isWorkflowActionRunning}
                                styles={styles}
                                onReviewResponse={requestReviewResponse}
                            />
                        )}
                        {useCompactVersionHeader && canShowVersionAction && renderVersionActionButton()}
                        {isVersionEditable && hasDefinitionChanges && (
                            <div className={styles.saveActions}>
                                <Button
                                    appearance="secondary"
                                    icon={<DismissRegular />}
                                    disabled={isSaving}
                                    onClick={resetEditorChanges}
                                >
                                    Cancel changes
                                </Button>
                                <Button
                                    appearance="primary"
                                    icon={<SaveRegular />}
                                    disabled={isSaving}
                                    onClick={handleSave}
                                >
                                    {isSaving ? "Saving..." : "Save changes"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {activeTab === "general" ? (
                    <GeneralTab
                        styles={styles}
                        useCompactVersionHeader={useCompactVersionHeader}
                        version={version}
                        statusOptions={statusOptions}
                        checklistName={checklistName}
                        versionType={versionType}
                        versionNumber={versionNumber}
                        description={description}
                        appliesTo={appliesTo}
                        appliesToTarget={appliesToTarget}
                        appliesToOptions={appliesToOptions}
                        isVersionEditable={!isEditorDisabled}
                        setChecklistName={setChecklistName}
                        setVersionType={setVersionType}
                        setVersionNumber={setVersionNumber}
                        setDescription={setDescription}
                        setAppliesTo={setAppliesTo}
                        markDefinitionChanged={markDefinitionChanged}
                    />
                ) : activeTab === "contents" ? (
                    <div
                        className={styles.tabPanel}
                        ref={contentsPanelRef}
                        tabIndex={-1}
                        onKeyDownCapture={handleContentsPanelKeyDownCapture}
                        onFocusCapture={handleContentsPanelFocusCapture}
                        onMouseDown={(event) => {
                            clearKeyboardFocusResetTimer();
                            if (!(event.target instanceof HTMLElement && event.target.closest("button,[role='button']"))) {
                                clearKeyboardFocusMode();
                            }
                            if (isEditableKeyboardTarget(event.target)) return;
                            if (event.target instanceof HTMLElement && event.target.closest("button,[role='button'],a")) return;
                            window.setTimeout(() => contentsPanelRef.current?.focus(), 0);
                        }}
                    >
                        {!isEditorDisabled && (
                            <div className={styles.shortcutHelpPanel}>
                                <Button
                                    appearance="subtle"
                                    className={styles.shortcutHelpToggle}
                                    icon={isShortcutHelpOpen ? <ChevronDownRegular /> : <ChevronRightRegular />}
                                    onClick={() => setIsShortcutHelpOpen((current) => !current)}
                                >
                                    Keyboard shortcuts
                                </Button>
                                {isShortcutHelpOpen && (
                                    <div className={styles.shortcutHelpContent}>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Up/Down</span><Text>Move highlight</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Tab</span><Text>Switch pane</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Enter</span><Text>Add after focus</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Shift+Enter</span><Text>Add child section</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Space</span><Text>Select or edit</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Ctrl/Cmd+S</span><Text>Save</Text></span>
                                        <span className={styles.shortcutHelpItem}><span className={styles.shortcutKey}>Delete</span><Text>Remove</Text></span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className={styles.contentsLayout}>
                            <div
                                className={[
                                    styles.contentsColumn,
                                    showEditHoverActions && keyboardNavigationActive && keyboardPane === "sections" ? styles.activeContentsColumn : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <div className={styles.contentsColumnHeader}>
                                    <div>
                                        <Text block weight="semibold">Sections</Text>
                                        <Caption1 className={styles.mutedText}>
                                            {`${sectionCount} section${sectionCount === 1 ? "" : "s"}`}
                                        </Caption1>
                                    </div>
                                </div>
                                <div className={styles.contentsColumnBody} ref={sectionTreeBodyRef}>
                                    <span id={sectionActionsDescriptionId} className={styles.visuallyHidden}>
                                        Section actions are available from the row action toolbar. Use horizontal arrow keys to move between action buttons.
                                    </span>
                                    {sectionDropIndicator && (
                                        <div
                                            className={[
                                                styles.sectionDropIndicator,
                                                sectionDropIndicator.kind === "line"
                                                    ? styles.sectionDropIndicatorLine
                                                    : styles.sectionDropIndicatorBox,
                                                sectionDropIndicator.tone === "danger" ? styles.sectionDropIndicatorDanger : "",
                                            ].filter(Boolean).join(" ")}
                                            style={{
                                                borderColor:
                                                    sectionDropIndicator.kind === "box" && sectionDropIndicator.tone === "danger"
                                                        ? tokens.colorNeutralStroke1
                                                        : undefined,
                                                top: sectionDropIndicator.top,
                                                left: sectionDropIndicator.left,
                                                width: sectionDropIndicator.width,
                                                height: sectionDropIndicator.height,
                                            }}
                                        >
                                            <span
                                                className={[
                                                    styles.sectionDropIndicatorLabel,
                                                    sectionDropIndicator.tone === "danger" ? styles.sectionDropIndicatorDangerLabel : "",
                                                ].filter(Boolean).join(" ")}
                                                style={{
                                                    top: sectionDropIndicator.kind === "line" ? "50%" : "calc(100% - 8px)",
                                                }}
                                            >
                                                {sectionDropIndicator.label}
                                            </span>
                                        </div>
                                    )}
                                    <Tree
                                        aria-label="Checklist sections"
                                        className={styles.sectionTree}
                                        openItems={rootOpenSectionIds}
                                        onOpenChange={handleSectionTreeOpenChange}
                                        onKeyDownCapture={handleSectionTreeKeyDown}
                                    >
                                        {sections.map((section) => (
                                            <React.Fragment key={section.id}>
                                                {renderSectionRow(section)}
                                                {draftSection?.parentId === null &&
                                                    draftSection.afterSectionId === section.id &&
                                                    renderDraftSectionRow(0)}
                                            </React.Fragment>
                                        ))}
                                        {draftSection?.parentId === null && !draftSection.afterSectionId && renderDraftSectionRow(0)}
                                        {!flattenedSections.length && !draftSection && (
                                            <div className={styles.contentsPlaceholder}>
                                                <Text weight="semibold">No sections have been defined.</Text>
                                            </div>
                                        )}
                                        {showAddContentActions && (
                                            <div className={styles.sectionAddTopLevelRow}>
                                                <Button
                                                    appearance="subtle"
                                                    icon={<AddRegular />}
                                                    className={[
                                                        styles.sectionAddAnotherButton,
                                                        keyboardNavigationActive && focusedSectionAction?.type === "addTopLevelSection"
                                                            ? styles.keyboardActionFocus
                                                            : "",
                                                    ].filter(Boolean).join(" ")}
                                                    style={getAddActionFocusStyle(
                                                        (
                                                            keyboardNavigationActive &&
                                                            focusedSectionAction?.type === "addTopLevelSection"
                                                        ) ||
                                                        focusedAddButtonKey === "add-top-level-section"
                                                    )}
                                                    disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                    onPointerDown={(event) => event.stopPropagation()}
                                                    onFocus={() => {
                                                        setKeyboardNavigationActive(true);
                                                        setKeyboardPane("sections");
                                                        setFocusedSectionAction({ type: "addTopLevelSection" });
                                                        setFocusedItemAction(null);
                                                        setFocusedAddButtonKey("add-top-level-section");
                                                        scheduleKeyboardFocusReset();
                                                    }}
                                                    onBlur={() => setFocusedAddButtonKey("")}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        startNewSection(null);
                                                    }}
                                                >
                                                    Add a section
                                                </Button>
                                            </div>
                                        )}
                                    </Tree>
                                </div>
                            </div>
                            <div
                                className={[
                                    styles.contentsColumn,
                                    showEditHoverActions && keyboardNavigationActive && keyboardPane === "items" ? styles.activeContentsColumn : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <div className={styles.contentsColumnHeader}>
                                    <div>
                                        {selectedSectionPath.length ? (
                                            <div className={styles.selectedSectionTitleRow}>
                                                <div className={styles.sectionPathTitle}>
                                                    {selectedSectionPath.map((section, index) => (
                                                        <React.Fragment key={section.id}>
                                                            {index > 0 && <Text className={styles.mutedText}>{">"}</Text>}
                                                            {editingSelectedSectionTitleId === section.id && index === selectedSectionPath.length - 1 ? (
                                                                <span className={styles.selectedSectionTitleEditRow}>
                                                                    <Input
                                                                        autoFocus
                                                                        className={styles.selectedSectionTitleInput}
                                                                        value={selectedSectionTitleDraft}
                                                                        disabled={isEditorDisabled}
                                                                        onChange={(_, data) => setSelectedSectionTitleDraft(data.value)}
                                                                        onKeyDown={(event) => {
                                                                            if (event.key === "Enter") {
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                confirmEditingSelectedSectionTitle();
                                                                            }
                                                                            if (event.key === "Escape") {
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                setEditingSelectedSectionTitleId("");
                                                                            }
                                                                        }}
                                                                        onBlur={confirmEditingSelectedSectionTitle}
                                                                    />
                                                                    <Button
                                                                        aria-label="Confirm selected section name"
                                                                        appearance="primary"
                                                                        className={styles.sectionNameConfirmButton}
                                                                        icon={<CheckmarkRegular />}
                                                                        disabled={isEditorDisabled || !selectedSectionTitleDraft.trim()}
                                                                        onMouseDown={(event) => event.preventDefault()}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            confirmEditingSelectedSectionTitle();
                                                                        }}
                                                                    />
                                                                </span>
                                                            ) : (
                                                                <Text
                                                                    weight={index === selectedSectionPath.length - 1 ? "semibold" : "regular"}
                                                                    className={index === selectedSectionPath.length - 1 ? styles.sectionPathCurrent : styles.sectionPathPart}
                                                                >
                                                                    {section.name || "Unnamed section"}
                                                                </Text>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                    {showEditHoverActions && selectedSection && (
                                                        <Button
                                                            aria-label="Edit selected section name"
                                                            appearance="subtle"
                                                            className={styles.sectionEditButton}
                                                            icon={<EditRegular />}
                                                            disabled={isEditorDisabled || Boolean(draftSection || draftItem || editingSelectedSectionTitleId)}
                                                            onClick={() => startEditSelectedSectionTitle(selectedSection)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <Text block weight="semibold">Select a section</Text>
                                        )}
                                        {selectedSection && (
                                            <Caption1 className={styles.mutedText}>
                                                {selectedSectionHasChildren
                                                    ? "Contains child sections"
                                                    : `${selectedSection.items.length} item${selectedSection.items.length === 1 ? "" : "s"}`}
                                            </Caption1>
                                        )}
                                    </div>
                                    <div className={styles.contentsActions}>
                                        {selectedSection && !selectedSectionHasChildren && (
                                            <Checkbox
                                                className={styles.sectionBulkCheckbox}
                                                checked={selectedSection.bulkServiceable}
                                                disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                label="Bulk check"
                                                onChange={(_, data) => {
                                                    updateSections((current) =>
                                                        updateSectionBulkServiceable(current, selectedSection.id, Boolean(data.checked))
                                                    );
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className={styles.itemWorkspace}>
                                    {!selectedSection ? (
                                        <div className={styles.contentsPlaceholder}>
                                            <Text weight="semibold">Select a section to manage its contents.</Text>
                                        </div>
                                    ) : selectedSectionHasChildren ? (
                                        <div className={styles.contentsPlaceholder}>
                                            <Text weight="semibold">Items can only be added to sections without child sections.</Text>
                                            {showAddContentActions && (
                                                <Button
                                                    icon={<AddRegular />}
                                                    disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                    onClick={() => startNewSection(selectedSection.id)}
                                                >
                                                    Add child section
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.itemList}>
                                            {selectedSection.items.map((item) => (
                                                <React.Fragment key={item.id}>
                                                    {draftItem?.itemId === item.id ? (
                                                        renderDraftItemRow()
                                                    ) : (
                                                        <div
                                                            className={[
                                                                styles.itemRow,
                                                                showEditHoverActions ? "" : styles.itemRowReadOnly,
                                                                showEditHoverActions && keyboardNavigationActive && keyboardPane === "items" && !focusedItemAction && selectedItemId === item.id ? styles.selectedItemRow : "",
                                                                showEditHoverActions && keyboardNavigationActive && keyboardPane === "items" && !focusedItemAction && selectedItemId === item.id ? styles.keyboardFocusRow : "",
                                                                draggedItem?.type === "item" && draggedItem.id === item.id ? styles.draggingRow : "",
                                                                dragOverTarget?.type === "item" && dragOverTarget.id === item.id && dragOverTarget.placement !== "after" ? styles.dropBeforeRow : "",
                                                                dragOverTarget?.type === "item" && dragOverTarget.id === item.id && dragOverTarget.placement === "after" ? styles.dropAfterRow : "",
                                                            ].filter(Boolean).join(" ")}
                                                            data-item-id={item.id}
                                                            onClick={() => {
                                                                if (ignoreNextItemClickRef.current) {
                                                                    ignoreNextItemClickRef.current = false;
                                                                    return;
                                                                }
                                                                startEditItem(selectedSection.id, item);
                                                            }}
                                                            onPointerDown={(event) => handleItemPointerDown(event, item)}
                                                            onPointerMove={handleItemPointerMove}
                                                            onPointerUp={handleItemPointerUp}
                                                            onPointerCancel={handleItemPointerCancel}
                                                            onMouseEnter={() => {
                                                                if (showEditHoverActions) setHoveredItemId(item.id);
                                                            }}
                                                            onMouseLeave={() => setHoveredItemId((current) => (current === item.id ? "" : current))}
                                                        >
                                                            <div className={styles.itemReadOnlyText}>
                                                                <Text weight="semibold">{item.name || "Unnamed item"}</Text>
                                                                {item.description && (
                                                                    <Caption1 className={styles.mutedText}>{item.description}</Caption1>
                                                                )}
	                                                                {item.requestItemIdentification && (
	                                                                    <Caption1 className={styles.itemIdentificationBadge}>
	                                                                        <TagRegular className={styles.itemIdentificationBadgeIcon} />
	                                                                        <span className={styles.itemIdentificationBadgeText}>
	                                                                            {[
	                                                                                `Identify equipment${item.identificationTarget ? ` - ${getIdentificationTargetOptionText(item.identificationTarget)}` : ""}`,
	                                                                                item.requiresChecklistRuns ? getRequiredChecklistRunsText(item.requiredChecklistRuns) : "",
	                                                                            ].filter(Boolean).join(" | ")}
	                                                                        </span>
	                                                                    </Caption1>
	                                                                )}
                                                            </div>
                                                            <div className={styles.rowActions}>
                                                                {item.quantity !== null && item.quantity !== undefined && (
                                                                    <Caption1 className={styles.mutedText}>{`Quantity ${item.quantity}`}</Caption1>
                                                                )}
                                                                <Button
                                                                    aria-label="Delete item"
                                                                    appearance="subtle"
                                                                    className={styles.itemDeleteButton}
                                                                    icon={<DeleteRegular />}
                                                                    style={{ visibility: showEditHoverActions && hoveredItemId === item.id ? "visible" : "hidden" }}
                                                                    disabled={isEditorDisabled}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        requestDeleteItem(selectedSection.id, item);
                                                                    }}
                                                                />
                                                            </div>
                                                            {showEditHoverActions && keyboardNavigationActive && keyboardPane === "items" && !focusedItemAction && selectedItemId === item.id && (
                                                                <span className={styles.keyboardFocusOverlay} />
                                                            )}
                                                        </div>
                                                    )}
                                                    {draftItem?.sectionId === selectedSection.id &&
                                                        !draftItem.itemId &&
                                                        draftItem.afterItemId === item.id &&
                                                        renderDraftItemRow()}
                                                </React.Fragment>
                                            ))}
                                            {draftItem?.sectionId === selectedSection.id &&
                                                !draftItem.itemId &&
                                                !draftItem.afterItemId &&
                                                renderDraftItemRow()}
                                            {showAddContentActions && selectedSection.items.length > 0 && draftItem?.sectionId !== selectedSection.id && (
                                                <div className={styles.itemAddAnotherRow}>
                                                    <Button
                                                        appearance="subtle"
                                                        className={[
                                                            styles.sectionAddAnotherButton,
                                                            keyboardNavigationActive && focusedItemAction?.type === "addItem" ? styles.keyboardActionFocus : "",
                                                        ].filter(Boolean).join(" ")}
                                                        style={getAddActionFocusStyle(
                                                            (keyboardNavigationActive && focusedItemAction?.type === "addItem") ||
                                                            focusedAddButtonKey === "add-item"
                                                        )}
                                                        disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                        onFocus={() => {
                                                            setKeyboardNavigationActive(true);
                                                            setKeyboardPane("items");
                                                            setFocusedSectionAction(null);
                                                            setFocusedItemAction({ type: "addItem" });
                                                            setFocusedAddButtonKey("add-item");
                                                            scheduleKeyboardFocusReset();
                                                        }}
                                                        onBlur={() => setFocusedAddButtonKey("")}
                                                        onClick={() => startNewItem(selectedSection.id)}
                                                    >
                                                        + Add an item
                                                    </Button>
                                                </div>
                                            )}
                                            {selectedSectionIsEmptyTopLevel && draftItem?.sectionId !== selectedSection.id && !draftSection && (
                                                <div className={styles.contentsPlaceholder}>
                                                    <Text weight="semibold">No content has been defined for this section.</Text>
                                                    <Caption1 className={styles.mutedText}>
                                                        Add items to this section, or define child sections to structure the checklist.
                                                    </Caption1>
                                                    {showAddContentActions && (
                                                        <div className={styles.placeholderActions}>
                                                            <Button
                                                                icon={<AddRegular />}
                                                                className={focusedAddButtonKey === `placeholder-add-child-section-${selectedSection.id}` ? styles.keyboardActionFocus : undefined}
                                                                style={getAddActionFocusStyle(focusedAddButtonKey === `placeholder-add-child-section-${selectedSection.id}`)}
                                                                disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                                onFocus={() => {
                                                                    setKeyboardNavigationActive(true);
                                                                    setKeyboardPane("sections");
                                                                    setFocusedSectionAction(null);
                                                                    setFocusedItemAction(null);
                                                                    setFocusedAddButtonKey(`placeholder-add-child-section-${selectedSection.id}`);
                                                                    scheduleKeyboardFocusReset();
                                                                }}
                                                                onBlur={() => setFocusedAddButtonKey("")}
                                                                onClick={() => startNewSection(selectedSection.id)}
                                                            >
                                                                Add child section
                                                            </Button>
                                                            <Button
                                                                appearance="primary"
                                                                icon={<AddRegular />}
                                                                className={keyboardNavigationActive && focusedItemAction?.type === "addItem" ? styles.keyboardActionFocus : undefined}
                                                                style={getAddActionFocusStyle(
                                                                    (keyboardNavigationActive && focusedItemAction?.type === "addItem") ||
                                                                    focusedAddButtonKey === "add-item-empty-section"
                                                                )}
                                                                disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                                onFocus={() => {
                                                                    setKeyboardNavigationActive(true);
                                                                    setKeyboardPane("items");
                                                                    setFocusedSectionAction(null);
                                                                    setFocusedItemAction({ type: "addItem" });
                                                                    setFocusedAddButtonKey("add-item-empty-section");
                                                                    scheduleKeyboardFocusReset();
                                                                }}
                                                                onBlur={() => setFocusedAddButtonKey("")}
                                                                onClick={() => startNewItem(selectedSection.id)}
                                                            >
                                                                Add an item
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!selectedSection.items.length && !selectedSectionIsEmptyTopLevel && draftItem?.sectionId !== selectedSection.id && (
                                                <div className={styles.contentsPlaceholder}>
                                                    <Text weight="semibold">No items have been defined for this section.</Text>
                                                    {showAddContentActions && (
                                                        <Button
                                                            appearance="primary"
                                                            icon={<AddRegular />}
                                                            className={keyboardNavigationActive && focusedItemAction?.type === "addItem" ? styles.keyboardActionFocus : undefined}
                                                            style={getAddActionFocusStyle(
                                                                (keyboardNavigationActive && focusedItemAction?.type === "addItem") ||
                                                                focusedAddButtonKey === "add-item-empty-list"
                                                            )}
                                                            disabled={isEditorDisabled || Boolean(draftSection || draftItem)}
                                                            onFocus={() => {
                                                                setKeyboardNavigationActive(true);
                                                                setKeyboardPane("items");
                                                                setFocusedSectionAction(null);
                                                                setFocusedItemAction({ type: "addItem" });
                                                                setFocusedAddButtonKey("add-item-empty-list");
                                                                scheduleKeyboardFocusReset();
                                                            }}
                                                            onBlur={() => setFocusedAddButtonKey("")}
                                                            onClick={() => startNewItem(selectedSection.id)}
                                                        >
                                                            Add an item
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "options" ? (
                    <OptionsTab
                        styles={styles}
                        options={options}
                        isVersionEditable={!isEditorDisabled}
                        updateOption={updateOption}
                    />
                ) : canShowApprovalHistory && activeTab === "approvalHistory" ? (
                    <ApprovalHistoryTab
                        styles={styles}
                        timelineEntries={timelineEntries}
                        relativeTimeNow={relativeTimeNow}
                    />
                ) : null}
            </div>
            <Dialog
                open={Boolean(pendingSubmissionResponse)}
                onOpenChange={(_, data) => {
                    if (!data.open && !isWorkflowActionRunning) setPendingSubmissionResponse(null);
                }}
            >
                <DialogSurface
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            confirmSubmissionResponse();
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            if (!isWorkflowActionRunning) setPendingSubmissionResponse(null);
                        }
                    }}
                >
                    <DialogBody>
                        <DialogTitle>{versionActionLabel}</DialogTitle>
                        <DialogContent>
                            <Text block>{versionActionDescription}</Text>
                            <Field label="Comments (optional)">
                                <Textarea
                                    resize="vertical"
                                    rows={5}
                                    disabled={isWorkflowActionRunning}
                                    value={pendingSubmissionResponse?.comments || ""}
                                    onChange={(_, data) =>
                                        setPendingSubmissionResponse((current) =>
                                            current ? { ...current, comments: data.value } : current
                                        )
                                    }
                                />
                            </Field>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                appearance="secondary"
                                disabled={isWorkflowActionRunning}
                                onClick={() => setPendingSubmissionResponse(null)}
                            >
                                Cancel
                            </Button>
                            <Button appearance="primary" disabled={isWorkflowActionRunning} onClick={confirmSubmissionResponse}>
                                {isWorkflowActionRunning ? "Working..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
            <Dialog
                open={Boolean(pendingReviewResponse)}
                onOpenChange={(_, data) => {
                    if (!data.open && !isWorkflowActionRunning) setPendingReviewResponse(null);
                }}
            >
                <DialogSurface
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            confirmReviewResponse();
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            if (!isWorkflowActionRunning) setPendingReviewResponse(null);
                        }
                    }}
                >
                    <DialogBody>
                        <DialogTitle>{getReviewOutcomeLabel(pendingReviewResponse?.outcome || "reject")}</DialogTitle>
                        <DialogContent>
                            <Field label="Reason" required>
                                <Textarea
                                    resize="vertical"
                                    rows={5}
                                    disabled={isWorkflowActionRunning}
                                    value={pendingReviewResponse?.reason || ""}
                                    onChange={(_, data) =>
                                        setPendingReviewResponse((current) =>
                                            current ? { ...current, reason: data.value } : current
                                        )
                                    }
                                />
                            </Field>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                appearance="secondary"
                                disabled={isWorkflowActionRunning}
                                onClick={() => setPendingReviewResponse(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                disabled={isWorkflowActionRunning || !pendingReviewResponse?.reason.trim()}
                                onClick={confirmReviewResponse}
                            >
                                {isWorkflowActionRunning ? "Working..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
            <Dialog
                modalType="alert"
                open={Boolean(pendingValidationMessage)}
                onOpenChange={(_, data) => {
                    if (!data.open) setPendingValidationMessage(null);
                }}
            >
                <DialogSurface
                    className={styles.validationDialogSurface}
                    style={{
                        backgroundColor: tokens.colorNeutralBackground1,
                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                        borderRadius: tokens.borderRadiusLarge,
                        boxShadow: tokens.shadow64,
                        color: tokens.colorNeutralForeground1,
                    }}
                >
                    <DialogBody>
                        <DialogTitle>{pendingValidationMessage?.title || "Action not allowed"}</DialogTitle>
                        <DialogContent>
                            <Text block className={styles.validationDialogMessage}>
                                {pendingValidationMessage?.message || "The requested action is not permitted."}
                            </Text>
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="primary" onClick={() => setPendingValidationMessage(null)}>
                                OK
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
            <Dialog
                open={Boolean(pendingDelete)}
                onOpenChange={(_, data) => {
                    if (!data.open) setPendingDelete(null);
                }}
            >
                <DialogSurface
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            if (isEditorDisabled) return;
                            confirmDelete();
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            setPendingDelete(null);
                        }
                    }}
                >
                    <DialogBody>
                        <DialogTitle>
                            {pendingDelete?.type === "item" ? "Confirm item deletion" : "Confirm section deletion"}
                        </DialogTitle>
                        <DialogContent>
                            <Text>{getDeleteConfirmationMessage()}</Text>
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" disabled={isEditorDisabled} onClick={() => setPendingDelete(null)}>
                                Cancel
                            </Button>
                            <Button appearance="primary" disabled={isEditorDisabled} onClick={confirmDelete}>
                                Delete Permanently
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
}

export default GeneratedComponent;
