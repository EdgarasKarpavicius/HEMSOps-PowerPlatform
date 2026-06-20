using Microsoft.Xrm.Sdk;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal static class DataverseEntityExtensions
    {
        public static int GetOptionValue(this Entity entity, string attributeName)
        {
            var option = entity.GetAttributeValue<OptionSetValue>(attributeName);
            return option?.Value ?? -1;
        }
    }
}
