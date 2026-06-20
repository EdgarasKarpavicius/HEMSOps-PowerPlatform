using Intelogy.HEMSOps.Plugins.Common;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Collections.Generic;

namespace Intelogy.HEMSOps.Plugins.ChecklistVersion
{
    /// <summary>
    /// Protects inactive Checklist Version definition fields from later mutation.
    /// </summary>
    public class ProtectPublishedChecklistVersionFieldsPlugin : PluginBase
    {
        private const string PreImageName = "PreImage";

        private static readonly HashSet<string> ImmutablePublishedFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ChecklistVersionConstants.ChecklistVersion.DefinitionJson,
            ChecklistVersionConstants.ChecklistVersion.DefinitionHash
        };

        private static readonly HashSet<string> LifecycleFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ChecklistVersionConstants.SystemAttribute.StateCode,
            ChecklistVersionConstants.SystemAttribute.StatusCode
        };

        public ProtectPublishedChecklistVersionFieldsPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(ProtectPublishedChecklistVersionFieldsPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;

            if (!PluginExecutionGuard.IsUpdatePreOperation(context))
            {
                return;
            }

            if (!context.InputParameters.Contains(ChecklistVersionConstants.Request.Target) ||
                !(context.InputParameters[ChecklistVersionConstants.Request.Target] is Entity target))
            {
                return;
            }

            if (target.LogicalName != ChecklistVersionConstants.Table.ChecklistVersion)
            {
                return;
            }

            var service = localPluginContext.SystemUserService;
            var existingVersion = GetExistingVersion(service, context, target.Id);
            var existingStateCode = existingVersion.GetOptionValue(ChecklistVersionConstants.SystemAttribute.StateCode);

            if (existingStateCode != ChecklistVersionConstants.State.Inactive)
            {
                return;
            }

            if (ContainsAny(target, ImmutablePublishedFields))
            {
                throw new InvalidPluginExecutionException("Published checklist version definition fields cannot be changed.");
            }

            if (!ContainsAny(target, LifecycleFields))
            {
                return;
            }

            var environmentVariableReader = new EnvironmentVariableReader(
                service,
                localPluginContext.TracingService);

            var requireReview = environmentVariableReader.GetBoolean(
                ChecklistVersionConstants.RequireChecklistVersionReviewSetting,
                defaultValue: true);

            if (!requireReview)
            {
                return;
            }

            var roleChecker = new SecurityRoleChecker(service);
            if (!roleChecker.UserHasRole(context.InitiatingUserId, ChecklistVersionConstants.ChecklistVersionApproverRoleName))
            {
                throw new InvalidPluginExecutionException("You do not have permission to change an inactive checklist version lifecycle status.");
            }
        }

        private static Entity GetExistingVersion(IOrganizationService service, IPluginExecutionContext context, Guid checklistVersionId)
        {
            if (context.PreEntityImages.Contains(PreImageName))
            {
                return context.PreEntityImages[PreImageName];
            }

            foreach (var image in context.PreEntityImages.Values)
            {
                if (image.LogicalName == ChecklistVersionConstants.Table.ChecklistVersion)
                {
                    return image;
                }
            }

            return service.Retrieve(
                ChecklistVersionConstants.Table.ChecklistVersion,
                checklistVersionId,
                new ColumnSet(ChecklistVersionConstants.SystemAttribute.StateCode));
        }

        private static bool ContainsAny(Entity target, HashSet<string> attributes)
        {
            foreach (var attribute in attributes)
            {
                if (target.Attributes.Contains(attribute))
                {
                    return true;
                }
            }

            return false;
        }

    }
}
