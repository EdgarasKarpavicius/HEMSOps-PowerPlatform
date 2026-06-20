using Intelogy.HEMSOps.Plugins.Common;
using Microsoft.Xrm.Sdk;
using System;

namespace Intelogy.HEMSOps.Plugins.ChecklistVersion
{
    internal sealed class ChecklistVersionHistoryWriter
    {
        private readonly IOrganizationService _service;

        public ChecklistVersionHistoryWriter(IOrganizationService service)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
        }

        public void Create(
            Guid checklistVersionId,
            int eventType,
            Guid eventByUserId,
            DateTime eventOn,
            string title,
            string description = null,
            string comments = null,
            int? reviewDecision = null,
            int? fromStatus = null,
            int? toStatus = null,
            string detailsJson = null)
        {
            if (checklistVersionId == Guid.Empty)
            {
                throw new InvalidPluginExecutionException("Checklist version id is required for history.");
            }

            if (eventByUserId == Guid.Empty)
            {
                throw new InvalidPluginExecutionException("Event user id is required for history.");
            }

            if (string.IsNullOrWhiteSpace(title))
            {
                throw new InvalidPluginExecutionException("History title is required.");
            }

            var history = new Entity(ChecklistVersionConstants.Table.ChecklistVersionHistory)
            {
                [ChecklistVersionConstants.ChecklistVersionHistory.Name] = title,
                [ChecklistVersionConstants.ChecklistVersionHistory.ChecklistVersion] =
                    new EntityReference(ChecklistVersionConstants.Table.ChecklistVersion, checklistVersionId),
                [ChecklistVersionConstants.ChecklistVersionHistory.EventType] = new OptionSetValue(eventType),
                [ChecklistVersionConstants.ChecklistVersionHistory.EventOn] = eventOn,
                [ChecklistVersionConstants.ChecklistVersionHistory.EventBy] = new EntityReference("systemuser", eventByUserId),
                [ChecklistVersionConstants.ChecklistVersionHistory.Title] = title
            };

            SetStringIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.Description, description);
            SetStringIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.Comments, comments);
            SetStringIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.DetailsJson, detailsJson);
            SetOptionIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.ReviewDecision, reviewDecision);
            SetIntegerIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.FromStatus, fromStatus);
            SetIntegerIfPresent(history, ChecklistVersionConstants.ChecklistVersionHistory.ToStatus, toStatus);

            _service.Create(history);
        }

        private static void SetStringIfPresent(Entity entity, string attributeName, string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                entity[attributeName] = value;
            }
        }

        private static void SetOptionIfPresent(Entity entity, string attributeName, int? value)
        {
            if (value.HasValue)
            {
                entity[attributeName] = new OptionSetValue(value.Value);
            }
        }

        private static void SetIntegerIfPresent(Entity entity, string attributeName, int? value)
        {
            if (value.HasValue)
            {
                entity[attributeName] = value.Value;
            }
        }
    }
}
