using Microsoft.Xrm.Sdk;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal sealed class ChecklistVersionApiResponse
    {
        public string Outcome { get; set; }

        public string Message { get; set; }

        public void WriteTo(ParameterCollection outputParameters)
        {
            outputParameters[ChecklistVersionConstants.Response.Outcome] = Outcome;
            outputParameters[ChecklistVersionConstants.Response.Message] = Message;
        }
    }
}
