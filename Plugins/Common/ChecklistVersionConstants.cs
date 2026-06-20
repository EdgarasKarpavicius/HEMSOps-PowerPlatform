namespace Intelogy.HEMSOps.Plugins.Common
{
    internal static class ChecklistVersionConstants
    {
        public const string RequireChecklistVersionReviewSetting = "int_RequireChecklistVersionReview";
        public const string ChecklistVersionApproverRoleName = "int_ops_checklistversionapprover";

        public static class Table
        {
            public const string Checklist = "int_checklist";
            public const string ChecklistVersion = "int_checklistversion";
            public const string ChecklistVersionHistory = "int_checklistversionhistory";
            public const string EnvironmentVariableDefinition = "environmentvariabledefinition";
            public const string EnvironmentVariableValue = "environmentvariablevalue";
        }

        public static class ChecklistVersion
        {
            public const string Id = "int_checklistversionid";
            public const string Checklist = "int_checklist";
            public const string ProposedChecklistName = "int_proposedchecklistname";
            public const string DefinitionJson = "int_definitionjson";
            public const string DefinitionHash = "int_definitionhash";
            public const string VersionNumber = "int_versionnumber";
            public const string SubmissionComments = "int_submissioncomments";
            public const string SubmittedBy = "int_submittedby";
            public const string SubmittedOn = "int_submittedon";
            public const string ReviewReason = "int_reviewreason";
            public const string ReviewedBy = "int_reviewedby";
            public const string ReviewedOn = "int_reviewedon";
            public const string ReviewDecision = "int_reviewdecision";
            public const string PublishedBy = "int_publishedby";
            public const string PublishedOn = "int_publishedon";
        }

        public static class ChecklistVersionHistory
        {
            public const string Name = "int_name";
            public const string ChecklistVersion = "int_checklistversion";
            public const string EventType = "int_eventtype";
            public const string EventOn = "int_eventon";
            public const string EventBy = "int_eventby";
            public const string Title = "int_title";
            public const string Description = "int_description";
            public const string Comments = "int_comments";
            public const string ReviewDecision = "int_reviewdecision";
            public const string FromStatus = "int_fromstatus";
            public const string ToStatus = "int_tostatus";
            public const string DetailsJson = "int_detailsjson";
        }

        public static class SystemAttribute
        {
            public const string StateCode = "statecode";
            public const string StatusCode = "statuscode";
        }

        public static class Checklist
        {
            public const string Id = "int_checklistid";
            public const string Name = "int_name";
            public const string Version = "int_version";
            public const string VersionSnapshot = "int_versionsnapshot";
        }

        public static class State
        {
            public const int Active = 0;
            public const int Inactive = 1;
        }

        public static class ChecklistVersionStatus
        {
            public const int Draft = 100000000;
            public const int RequiresAmendments = 100000005;
            public const int PendingReview = 100000010;
            public const int Published = 100000020;
            public const int Rejected = 100000030;
            public const int Cancelled = 100000040;
            public const int Superseded = 100000050;
            public const int Archived = 100000060;
        }

        public static class ChecklistStatus
        {
            public const int RequiresAttention = 100000000;
            public const int RequiresAmendments = 100000005;
            public const int PendingReview = 100000010;
            public const int Published = 100000020;
        }

        public static class ReviewDecision
        {
            public const int Approved = 100000000;
            public const int Rejected = 200000000;
            public const int RequiresAmendments = 300000000;
        }

        public static class HistoryEventType
        {
            public const int DraftCreated = 100000000;
            public const int Submitted = 100000010;
            public const int Published = 100000020;
            public const int Approved = 100000030;
            public const int Rejected = 100000040;
            public const int RequiresAmendments = 100000050;
            public const int Superseded = 100000060;
            public const int Archived = 100000070;
        }

        public static class Request
        {
            public const string Target = "Target";
            public const string SubmissionComments = "SubmissionComments";
            public const string ReviewDecision = "ReviewDecision";
            public const string Reason = "Reason";
        }

        public static class Message
        {
            public const string Update = "Update";
            public const string SubmitOrPublishDraftChecklistVersion = "int_SubmitOrPublishDraftChecklistVersion";
            public const string ApproveChecklistVersionForPublishing = "int_ApproveChecklistVersionForPublishing";
        }

        public static class Stage
        {
            public const int PreOperation = 20;
        }

        public static class Response
        {
            public const string Outcome = "Outcome";
            public const string Message = "Message";
        }
    }
}
