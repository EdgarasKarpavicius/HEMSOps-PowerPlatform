using Intelogy.HEMSOps.Plugins.Common;
using Intelogy.HEMSOps.Plugins.Utils;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;

namespace Intelogy.HEMSOps.Plugins.ChecklistVersion
{
    internal sealed class PublishChecklistVersion
    {
        private readonly IOrganizationService _service;
        private readonly EnvironmentVariableReader _environmentVariableReader;

        public PublishChecklistVersion(IOrganizationService service, ITracingService tracingService)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
            _environmentVariableReader = new EnvironmentVariableReader(service, tracingService);
        }

        public ChecklistVersionApiResponse Execute(
            EntityReference checklistVersionReference,
            bool approvalPathValidated,
            Guid publishingUserId,
            DateTime operationTime,
            string comments = null)
        {
            if (checklistVersionReference == null)
            {
                throw new InvalidPluginExecutionException("Target is required.");
            }

            if (checklistVersionReference.LogicalName != ChecklistVersionConstants.Table.ChecklistVersion)
            {
                throw new InvalidPluginExecutionException("Target must reference a checklist version.");
            }

            var requireReview = _environmentVariableReader.GetBoolean(
                ChecklistVersionConstants.RequireChecklistVersionReviewSetting,
                defaultValue: true);

            var version = RetrieveChecklistVersion(checklistVersionReference.Id);
            var statusCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StatusCode);
            var stateCode = version.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StateCode);
            var checklistReference = version.GetAttributeValue<EntityReference>(ChecklistVersionConstants.ChecklistVersion.Checklist);
            var definitionJson = version.GetAttributeValue<string>(ChecklistVersionConstants.ChecklistVersion.DefinitionJson);
            var versionNumber = version.GetAttributeValue<decimal?>(ChecklistVersionConstants.ChecklistVersion.VersionNumber);
            var proposedChecklistName = version.GetAttributeValue<string>(ChecklistVersionConstants.ChecklistVersion.ProposedChecklistName);

            if (stateCode != ChecklistVersionConstants.State.Active)
            {
                throw new InvalidPluginExecutionException("Only active checklist versions can be published.");
            }

            if (checklistReference == null)
            {
                throw new InvalidPluginExecutionException("The checklist version must be linked to a checklist.");
            }

            if (string.IsNullOrWhiteSpace(definitionJson))
            {
                throw new InvalidPluginExecutionException("The checklist version must have a definition before it can be published.");
            }

            if (!versionNumber.HasValue)
            {
                throw new InvalidPluginExecutionException("The checklist version must have a version number before it can be published.");
            }

            if (requireReview)
            {
                if (!approvalPathValidated || statusCode != ChecklistVersionConstants.ChecklistVersionStatus.PendingReview)
                {
                    throw new InvalidPluginExecutionException("Checklist version review is required before publishing.");
                }
            }
            else if (statusCode != ChecklistVersionConstants.ChecklistVersionStatus.Draft)
            {
                throw new InvalidPluginExecutionException("Only draft checklist versions can be directly published.");
            }

            var definitionHash = Sha256Hasher.ComputeHash(definitionJson);
            var checklist = RetrieveChecklist(checklistReference.Id);
            var currentChecklistName = checklist.GetAttributeValue<string>(ChecklistVersionConstants.Checklist.Name);

            var publishVersion = new Entity(ChecklistVersionConstants.Table.ChecklistVersion, checklistVersionReference.Id)
            {
                [ChecklistVersionConstants.ChecklistVersion.DefinitionHash] = definitionHash,
                [ChecklistVersionConstants.ChecklistVersion.PublishedBy] = new EntityReference("systemuser", publishingUserId),
                [ChecklistVersionConstants.ChecklistVersion.PublishedOn] = operationTime,
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Inactive),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistVersionStatus.Published)
            };

            if (!approvalPathValidated)
            {
                publishVersion[ChecklistVersionConstants.ChecklistVersion.SubmittedBy] = new EntityReference("systemuser", publishingUserId);
                publishVersion[ChecklistVersionConstants.ChecklistVersion.SubmittedOn] = operationTime;
                if (comments != null)
                {
                    publishVersion[ChecklistVersionConstants.ChecklistVersion.SubmissionComments] = comments;
                }
            }

            _service.Update(publishVersion);

            var historyWriter = new ChecklistVersionHistoryWriter(_service);
            var publishedFromStatus = approvalPathValidated ? (int?)null : statusCode;
            var publishedToStatus = approvalPathValidated
                ? (int?)null
                : ChecklistVersionConstants.ChecklistVersionStatus.Published;

            historyWriter.Create(
                checklistVersionReference.Id,
                ChecklistVersionConstants.HistoryEventType.Published,
                publishingUserId,
                operationTime,
                "Published",
                description: "Checklist version published.",
                comments: comments,
                fromStatus: publishedFromStatus,
                toStatus: publishedToStatus);

            foreach (var publishedVersion in RetrieveOtherPublishedVersions(checklistVersionReference.Id, checklistReference.Id).Entities)
            {
                var supersedeVersion = new Entity(ChecklistVersionConstants.Table.ChecklistVersion, publishedVersion.Id)
                {
                    [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Inactive),
                    [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistVersionStatus.Superseded)
                };
                _service.Update(supersedeVersion);

                historyWriter.Create(
                    publishedVersion.Id,
                    ChecklistVersionConstants.HistoryEventType.Superseded,
                    publishingUserId,
                    operationTime,
                    "Superseded",
                    description: "Checklist version superseded by a newer published version.",
                    fromStatus: ChecklistVersionConstants.ChecklistVersionStatus.Published,
                    toStatus: ChecklistVersionConstants.ChecklistVersionStatus.Superseded,
                    detailsJson: BuildSupersededDetailsJson(checklistVersionReference.Id));
            }

            var publishChecklist = new Entity(ChecklistVersionConstants.Table.Checklist, checklistReference.Id)
            {
                [ChecklistVersionConstants.Checklist.Version] = versionNumber.Value,
                [ChecklistVersionConstants.Checklist.VersionSnapshot] = checklistVersionReference,
                [ChecklistVersionConstants.SystemAttribute.StateCode] = new OptionSetValue(ChecklistVersionConstants.State.Active),
                [ChecklistVersionConstants.SystemAttribute.StatusCode] = new OptionSetValue(ChecklistVersionConstants.ChecklistStatus.Published)
            };

            var trimmedProposedChecklistName = proposedChecklistName?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmedProposedChecklistName) &&
                !string.Equals(trimmedProposedChecklistName, currentChecklistName?.Trim(), StringComparison.Ordinal))
            {
                publishChecklist[ChecklistVersionConstants.Checklist.Name] = trimmedProposedChecklistName;
            }

            _service.Update(publishChecklist);

            return new ChecklistVersionApiResponse
            {
                Outcome = approvalPathValidated ? "approvedAndPublished" : "published",
                Message = approvalPathValidated ? "Checklist version approved and published." : "Checklist version published."
            };
        }

        private Entity RetrieveChecklistVersion(Guid checklistVersionId)
        {
            return _service.Retrieve(
                ChecklistVersionConstants.Table.ChecklistVersion,
                checklistVersionId,
                new ColumnSet(
                    ChecklistVersionConstants.SystemAttribute.StateCode,
                    ChecklistVersionConstants.SystemAttribute.StatusCode,
                    ChecklistVersionConstants.ChecklistVersion.Checklist,
                    ChecklistVersionConstants.ChecklistVersion.ProposedChecklistName,
                    ChecklistVersionConstants.ChecklistVersion.DefinitionJson,
                    ChecklistVersionConstants.ChecklistVersion.VersionNumber));
        }

        private Entity RetrieveChecklist(Guid checklistId)
        {
            return _service.Retrieve(
                ChecklistVersionConstants.Table.Checklist,
                checklistId,
                new ColumnSet(ChecklistVersionConstants.Checklist.Name));
        }

        private EntityCollection RetrieveOtherPublishedVersions(Guid currentVersionId, Guid checklistId)
        {
            var query = new QueryExpression(ChecklistVersionConstants.Table.ChecklistVersion)
            {
                ColumnSet = new ColumnSet(false)
            };
            query.Criteria.AddCondition(ChecklistVersionConstants.ChecklistVersion.Checklist, ConditionOperator.Equal, checklistId);
            query.Criteria.AddCondition(ChecklistVersionConstants.SystemAttribute.StatusCode, ConditionOperator.Equal, ChecklistVersionConstants.ChecklistVersionStatus.Published);
            query.Criteria.AddCondition(ChecklistVersionConstants.ChecklistVersion.Id, ConditionOperator.NotEqual, currentVersionId);

            return _service.RetrieveMultiple(query);
        }

        private static string BuildSupersededDetailsJson(Guid supersededByChecklistVersionId)
        {
            return "{\"supersededByChecklistVersionId\":\"" + supersededByChecklistVersionId.ToString("D") + "\"}";
        }
    }
}
