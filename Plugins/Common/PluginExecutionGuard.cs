using Microsoft.Xrm.Sdk;
using System;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal static class PluginExecutionGuard
    {
        public static void RequireMessage(IPluginExecutionContext context, string messageName)
        {
            if (!string.Equals(context.MessageName, messageName, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidPluginExecutionException($"This plug-in can only run for {messageName}.");
            }
        }

        public static bool IsUpdatePreOperation(IPluginExecutionContext context)
        {
            return string.Equals(context.MessageName, ChecklistVersionConstants.Message.Update, StringComparison.OrdinalIgnoreCase) &&
                context.Stage == ChecklistVersionConstants.Stage.PreOperation;
        }
    }
}
