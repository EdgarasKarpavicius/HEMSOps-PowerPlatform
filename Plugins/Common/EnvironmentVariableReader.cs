using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal sealed class EnvironmentVariableReader
    {
        private readonly IOrganizationService _service;
        private readonly ITracingService _tracingService;

        public EnvironmentVariableReader(IOrganizationService service, ITracingService tracingService)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
            _tracingService = tracingService;
        }

        public bool GetBoolean(string schemaName, bool defaultValue)
        {
            try
            {
                var definition = GetDefinition(schemaName);
                if (definition == null)
                {
                    return defaultValue;
                }

                var configuredValue = GetCurrentValue(definition.Id);
                var rawValue = configuredValue ?? definition.GetAttributeValue<string>("defaultvalue");

                if (TryParseBoolean(rawValue, out var parsedValue))
                {
                    return parsedValue;
                }
            }
            catch (Exception ex)
            {
                _tracingService?.Trace("Could not read environment variable {0}. Defaulting to {1}. Error: {2}", schemaName, defaultValue, ex.Message);
            }

            return defaultValue;
        }

        private Entity GetDefinition(string schemaName)
        {
            var query = new QueryExpression(ChecklistVersionConstants.Table.EnvironmentVariableDefinition)
            {
                ColumnSet = new ColumnSet("defaultvalue"),
                TopCount = 1
            };
            query.Criteria.AddCondition("schemaname", ConditionOperator.Equal, schemaName);

            var results = _service.RetrieveMultiple(query);
            return results.Entities.Count == 0 ? null : results.Entities[0];
        }

        private string GetCurrentValue(Guid definitionId)
        {
            var query = new QueryExpression(ChecklistVersionConstants.Table.EnvironmentVariableValue)
            {
                ColumnSet = new ColumnSet("value"),
                TopCount = 1
            };
            query.Criteria.AddCondition("environmentvariabledefinitionid", ConditionOperator.Equal, definitionId);
            query.AddOrder("modifiedon", OrderType.Descending);

            var results = _service.RetrieveMultiple(query);
            return results.Entities.Count == 0 ? null : results.Entities[0].GetAttributeValue<string>("value");
        }

        private static bool TryParseBoolean(string value, out bool result)
        {
            result = false;

            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var normalizedValue = value.Trim();
            if (bool.TryParse(normalizedValue, out result))
            {
                return true;
            }

            if (string.Equals(normalizedValue, "1", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalizedValue, "yes", StringComparison.OrdinalIgnoreCase))
            {
                result = true;
                return true;
            }

            if (string.Equals(normalizedValue, "0", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalizedValue, "no", StringComparison.OrdinalIgnoreCase))
            {
                result = false;
                return true;
            }

            return false;
        }
    }
}
