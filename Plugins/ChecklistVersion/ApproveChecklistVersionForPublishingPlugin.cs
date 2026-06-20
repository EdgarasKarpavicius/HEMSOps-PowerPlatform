using Intelogy.HEMSOps.Plugins.Common;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;

namespace Intelogy.HEMSOps.Plugins.ChecklistVersion
{
    /// <summary>
    /// Handles review responses for a pending-review Checklist Version.
    /// </summary>
    public class ApproveChecklistVersionForPublishingPlugin : PluginBase
    {
        public ApproveChecklistVersionForPublishingPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(ApproveChecklistVersionForPublishingPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;
            PluginExecutionGuard.RequireMessage(context, ChecklistVersionConstants.Message.ApproveChecklistVersionForPublishing);

            var service = localPluginContext.SystemUserService;
            var target = CustomApiRequest.GetChecklistVersionTarget(context.InputParameters);
            var reviewDecision = CustomApiRequest.GetRequiredOptionValue(context.InputParameters, ChecklistVersionConstants.Request.ReviewDecision);
            var reason = CustomApiRequest.GetOptionalString(context.InputParameters, ChecklistVersionConstants.Request.Reason);

            ValidateReviewDecision(reviewDecision, reason);

            var environmentVariableReader = new EnvironmentVariableReader(service, localPluginContext.TracingService);
            var requireReview = environmentVariableReader.GetBoolean(
                ChecklistVersionConstants.RequireChecklistVersionReviewSetting,
                defaultValue: true);

            if (!requireReview)
            {
                throw new InvalidPluginExecutionException("Checklist version review is not required in this environment.");
            }

            var roleChecker = new SecurityRoleChecker(service);
            if (!roleChecker.UserHasRole(context.InitiatingUserId, ChecklistVersionConstants.ChecklistVersionApproverRoleName))
            {
                throw new InvalidPluginExecutionException("You do not have permission to approve checklist versions.");
            }

            var version = RetrieveChecklistVersion(service, target.Id);
            ValidatePendingReviewChecklistVersion(version);

            ChecklistVersionApiResponse response;

            if (reviewDecision == ChecklistVersionConstants.ReviewDecision.Approved)
            {
                localPluginContext.Trace($"Approving checklist version {target.Id} for publishing.");
                StoreReviewMetadata(
                    service,
                    context,
                    version.Id,
                    reason,
                    reviewDecision);

                new ChecklistVersionHistoryWriter(service).Create(
                    version.Id,
                    ChecklistVersionConstants.HistoryEventType.Approved,
                    context.InitiatingUserId,
                    context.OperationCreatedOn,
                    "Approved",
                    description: "Checklist version approved for publishing.",
                    comments: reason,
                    reviewDecision: ChecklistVersionConstants.ReviewDecision.Approved);

                response = new PublishChecklistVersion(service, localPluginContext.TracingService)
                    .Execute(
                        target,
                        approvalPathValidated: true,
                        publishingUserId: context.InitiatingUserId,
                        operationTime: context.OperationCreatedOn,
                        publishedHistoryEventOn: context.OperationCreatedOn.AddTicks(-1));
            }
            else if (reviewDecision == ChecklistVersionConstants.ReviewDecision.RequiresAmendments)
            {
                localPluginContext.Trace($"Returning checklist version {target.Id} for amendments.");
                response = MoveToRequiresAmendments(service, context, version, reason);
            }
            else
            {
                localPluginContext.Trace($"Rejecting checklist version {target.Id}.");
                response = Reject(service, context, version, reason);
            }

            response.WriteTo(context.OutputParameters);
        }

        private static Entity RetrieveChecklistVersion(IOrganizationService service, Guid checklistVersionId)
        {
            return service.Retrieve(
                ChecklistVersionConstants.Table.ChecklistVersion,
                checklistVersionId,
                new ColumnSet(
                    ChecklistVersionConstants.SystemAttribute.StateCode,
                    ChecklistVersionConstants.SystemAttribute.StatusCode,
                    ChecklistVersionConstants.ChecklistVersion.Checklist));
        }

        private static void ValidatePendingReviewChecklistVersion(Entity version)
        {
            var stateCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StateCode);
            var statusCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StatusCode);

            if (stateCode != ChecklistVersionConstants.State.Active ||
                statusCode != ChecklistVersionConstants.ChecklistVersionStatus.PendingReview)
            {
                throw new InvalidPluginExecutionException("Only pending-review checklist versions can be reviewed.");
            }

            if (version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist) == null)
            {
                throw new InvalidPluginExecutionException("The checklist version must be linked to a checklist.");
            }
        }

        private static void ValidateReviewDecision(int reviewDecision, string reason)
        {
            var isApprove = reviewDecision == ChecklistVersionConstants.ReviewDecision.Approved;
            var isRequiresAmendments = reviewDecision == ChecklistVersionConstants.ReviewDecision.RequiresAmendments;
            var isReject = reviewDecision == ChecklistVersionConstants.ReviewDecision.Rejected;

            if (!isApprove && !isRequiresAmendments && !isReject)
            {
                throw new InvalidPluginExecutionException("ReviewDecision must be Approved, Rejected, or Requires Amendments.");
            }

            if ((isRequiresAmendments || isReject) && string.IsNullOrWhiteSpace(reason))
            {
                throw new InvalidPluginExecutionException("Reason is required when requesting amendments or rejecting a checklist version.");
            }
        }

        private static void StoreReviewMetadata(
            IOrganizationService service,
            IPluginExecutionContext context,
            Guid checklistVersionId,
            string reason,
            int reviewDecision)
        {
            var updateVersion = new Entity(ChecklistVersionConstants.Table.ChecklistVersion, checklistVersionId)
            {
                [ChecklistVersionConstants.ChecklistVersion.ReviewReason] = reason,
                [ChecklistVersionConstants.ChecklistVersion.ReviewedBy] = new EntityReference("systemuser", context.InitiatingUserId),
                [ChecklistVersionConstants.ChecklistVersion.ReviewedOn] = context.OperationCreatedOn,
                [ChecklistVersionConstants.ChecklistVersion.ReviewDecision] = new OptionSetValue(reviewDecision)
            };

            service.Update(updateVersion);
        }

        private static ChecklistVersionApiResponse MoveToRequiresAmendments(
            IOrganizationService service,
            IPluginExecutionContext context,
            Entity version,
            string reason)
        {
            var checklistReference = version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist);

            ExecuteReviewOutcomeTransaction(
                service,
                context,
                version.Id,
                checklistReference.Id,
                reason,
                ChecklistVersionConstants.State.Active,
                ChecklistVersionConstants.ChecklistVersionStatus.Draft,
                ChecklistVersionConstants.ReviewDecision.RequiresAmendments);

            return new ChecklistVersionApiResponse
            {
                Outcome = "requiresAmendments",
                Message = "Checklist version requires amendments."
            };
        }

        private static ChecklistVersionApiResponse Reject(
            IOrganizationService service,
            IPluginExecutionContext context,
            Entity version,
            string reason)
        {
            var checklistReference = version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist);

            ExecuteReviewOutcomeTransaction(
                service,
                context,
                version.Id,
                checklistReference.Id,
                reason,
                ChecklistVersionConstants.State.Inactive,
                ChecklistVersionConstants.ChecklistVersionStatus.Rejected,
                ChecklistVersionConstants.ReviewDecision.Rejected);

            return new ChecklistVersionApiResponse
            {
                Outcome = "rejected",
                Message = "Checklist version rejected."
            };
        }

        private static void ExecuteReviewOutcomeTransaction(
            IOrganizationService service,
            IPluginExecutionContext context,
            Guid checklistVersionId,
            Guid checklistId,
            string reason,
            int checklistVersionState,
            int checklistVersionStatus,
            int reviewDecision)
        {
            var updateVersion = new Entity(ChecklistVersionConstants.Table.ChecklistVersion, checklistVersionId)
            {
                [ChecklistVersionConstants.ChecklistVersion.ReviewReason] = reason,
                [ChecklistVersionConstants.ChecklistVersion.ReviewedBy] = new EntityReference("systemuser", context.InitiatingUserId),
                [ChecklistVersionConstants.ChecklistVersion.ReviewedOn] = context.OperationCreatedOn,
                [ChecklistVersionConstants.ChecklistVersion.ReviewDecision] = new OptionSetValue(reviewDecision),
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(checklistVersionState),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(checklistVersionStatus)
            };
            service.Update(updateVersion);

            var updateChecklist = new Entity(ChecklistVersionConstants.Table.Checklist, checklistId)
            {
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Active),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistStatus.RequiresAttention)
            };
            service.Update(updateChecklist);

            new ChecklistVersionHistoryWriter(service).Create(
                checklistVersionId,
                GetReviewHistoryEventType(reviewDecision),
                context.InitiatingUserId,
                context.OperationCreatedOn,
                GetReviewHistoryTitle(reviewDecision),
                description: GetReviewHistoryDescription(reviewDecision),
                comments: reason,
                reviewDecision: reviewDecision,
                fromStatus: ChecklistVersionConstants.ChecklistVersionStatus.PendingReview,
                toStatus: checklistVersionStatus);
        }

        private static int GetReviewHistoryEventType(int reviewDecision)
        {
            return reviewDecision == ChecklistVersionConstants.ReviewDecision.RequiresAmendments
                ? ChecklistVersionConstants.HistoryEventType.RequiresAmendments
                : ChecklistVersionConstants.HistoryEventType.Rejected;
        }

        private static string GetReviewHistoryTitle(int reviewDecision)
        {
            return reviewDecision == ChecklistVersionConstants.ReviewDecision.RequiresAmendments
                ? "Requires amendments"
                : "Rejected";
        }

        private static string GetReviewHistoryDescription(int reviewDecision)
        {
            return reviewDecision == ChecklistVersionConstants.ReviewDecision.RequiresAmendments
                ? "Checklist version returned to draft for amendments."
                : "Checklist version rejected.";
        }
    }
}
