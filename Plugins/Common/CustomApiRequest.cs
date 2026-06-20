using Microsoft.Xrm.Sdk;
using System;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal static class CustomApiRequest
    {
        public static EntityReference GetChecklistVersionTarget(ParameterCollection inputParameters)
        {
            if (!inputParameters.Contains(ChecklistVersionConstants.Request.Target) ||
                inputParameters[ChecklistVersionConstants.Request.Target] == null)
            {
                throw new InvalidPluginExecutionException("Target is required.");
            }

            if (inputParameters[ChecklistVersionConstants.Request.Target] is EntityReference targetReference)
            {
                ValidateTargetLogicalName(targetReference.LogicalName);
                return targetReference;
            }

            if (inputParameters[ChecklistVersionConstants.Request.Target] is Entity targetEntity)
            {
                ValidateTargetLogicalName(targetEntity.LogicalName);
                return targetEntity.ToEntityReference();
            }

            throw new InvalidPluginExecutionException("Target must be a checklist version reference.");
        }

        public static string GetOptionalString(ParameterCollection inputParameters, string parameterName)
        {
            if (!inputParameters.Contains(parameterName) || inputParameters[parameterName] == null)
            {
                return null;
            }

            return inputParameters[parameterName].ToString();
        }

        public static string GetRequiredString(ParameterCollection inputParameters, string parameterName)
        {
            var value = GetOptionalString(inputParameters, parameterName);

            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidPluginExecutionException($"{parameterName} is required.");
            }

            return value.Trim();
        }

        public static int GetRequiredOptionValue(ParameterCollection inputParameters, string parameterName)
        {
            if (!inputParameters.Contains(parameterName) || inputParameters[parameterName] == null)
            {
                throw new InvalidPluginExecutionException($"{parameterName} is required.");
            }

            var value = inputParameters[parameterName];

            if (value is OptionSetValue optionSetValue)
            {
                return optionSetValue.Value;
            }

            if (value is int intValue)
            {
                return intValue;
            }

            if (int.TryParse(value.ToString(), out var parsedValue))
            {
                return parsedValue;
            }

            throw new InvalidPluginExecutionException($"{parameterName} must be a choice/integer value.");
        }

        private static void ValidateTargetLogicalName(string logicalName)
        {
            if (logicalName != ChecklistVersionConstants.Table.ChecklistVersion)
            {
                throw new InvalidPluginExecutionException("Target must reference a checklist version.");
            }
        }
    }
}
