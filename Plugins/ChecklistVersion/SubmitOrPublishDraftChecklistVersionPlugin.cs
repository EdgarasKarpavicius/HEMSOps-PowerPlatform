using Intelogy.HEMSOps.Plugins.Common;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;

namespace Intelogy.HEMSOps.Plugins.ChecklistVersion
{
    /// <summary>
    /// Handles the transition of a draft Checklist Version into either approval or publication.
    /// The selected path is controlled by solution configuration.
    /// </summary>
    public class SubmitOrPublishDraftChecklistVersionPlugin : PluginBase
    {
        public SubmitOrPublishDraftChecklistVersionPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(SubmitOrPublishDraftChecklistVersionPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;
            PluginExecutionGuard.RequireMessage(context, ChecklistVersionConstants.Message.SubmitOrPublishDraftChecklistVersion);

            var target = CustomApiRequest.GetChecklistVersionTarget(context.InputParameters);
            var service = localPluginContext.SystemUserService;
            var version = RetrieveChecklistVersion(service, target.Id);
            ValidateDraftChecklistVersion(version);

            var environmentVariableReader = new EnvironmentVariableReader(service, localPluginContext.TracingService);
            var requireReview = environmentVariableReader.GetBoolean(
                ChecklistVersionConstants.RequireChecklistVersionReviewSetting,
                defaultValue: true);

            ChecklistVersionApiResponse response;

            if (requireReview)
            {
                localPluginContext.Trace($"Submitting checklist version {target.Id} for review.");
                response = SubmitForReview(service, context, version);
            }
            else
            {
                localPluginContext.Trace($"Publishing checklist version {target.Id} directly.");
                response = new PublishChecklistVersion(service, localPluginContext.TracingService)
                    .Execute(target, approvalPathValidated: false, publishingUserId: context.InitiatingUserId, operationTime: context.OperationCreatedOn);
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
                    ChecklistVersionConstants.ChecklistVersion.Checklist,
                    ChecklistVersionConstants.ChecklistVersion.DefinitionJson));
        }

        private static void ValidateDraftChecklistVersion(Entity version)
        {
            var stateCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StateCode);
            var statusCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StatusCode);

            if (stateCode != ChecklistVersionConstants.State.Active ||
                statusCode != ChecklistVersionConstants.ChecklistVersionStatus.Draft)
            {
                throw new InvalidPluginExecutionException("Only draft checklist versions can be submitted or published.");
            }

            if (version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist) == null)
            {
                throw new InvalidPluginExecutionException("The checklist version must be linked to a checklist.");
            }

            if (string.IsNullOrWhiteSpace(version.GetAttributeValue<string>(ChecklistVersionConstants.ChecklistVersion.DefinitionJson)))
            {
                throw new InvalidPluginExecutionException("The checklist version must have a definition before it can be submitted or published.");
            }
        }

        private static ChecklistVersionApiResponse SubmitForReview(
            IOrganizationService service,
            IPluginExecutionContext context,
            Entity version)
        {
            var checklistReference = version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist);
            var submissionComments = CustomApiRequest.GetOptionalString(context.InputParameters, ChecklistVersionConstants.Request.SubmissionComments);

            var updateVersion = new Entity(ChecklistVersionConstants.Table.ChecklistVersion, version.Id)
            {
                [ChecklistVersionConstants.ChecklistVersion.SubmissionComments] = submissionComments,
                [ChecklistVersionConstants.ChecklistVersion.SubmittedBy] = new EntityReference("systemuser", context.InitiatingUserId),
                [ChecklistVersionConstants.ChecklistVersion.SubmittedOn] = context.OperationCreatedOn,
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Active),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistVersionStatus.PendingReview)
            };
            service.Update(updateVersion);

            var updateChecklist = new Entity(ChecklistVersionConstants.Table.Checklist, checklistReference.Id)
            {
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Active),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistStatus.PendingReview)
            };
            service.Update(updateChecklist);

            return new ChecklistVersionApiResponse
            {
                Outcome = "submittedForReview",
                Message = "Checklist version submitted for review."
            };
        }
    }
}
