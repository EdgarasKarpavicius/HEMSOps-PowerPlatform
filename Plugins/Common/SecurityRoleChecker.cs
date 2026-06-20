using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Security;

namespace Intelogy.HEMSOps.Plugins.Common
{
    internal sealed class SecurityRoleChecker
    {
        private readonly IOrganizationService _service;

        public SecurityRoleChecker(IOrganizationService service)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
        }

        public bool UserHasRole(Guid userId, string roleName)
        {
            return UserHasDirectRole(userId, roleName) || UserHasTeamRole(userId, roleName);
        }

        private bool UserHasDirectRole(Guid userId, string roleName)
        {
            var query = new QueryExpression("role")
            {
                ColumnSet = new ColumnSet(false),
                TopCount = 1
            };

            query.Criteria.AddCondition("name", ConditionOperator.Equal, roleName);

            var userRoleLink = query.AddLink("systemuserroles", "roleid", "roleid");
            userRoleLink.LinkCriteria.AddCondition("systemuserid", ConditionOperator.Equal, userId);

            return _service.RetrieveMultiple(query).Entities.Count > 0;
        }

        private bool UserHasTeamRole(Guid userId, string roleName)
        {
            var fetchXml = $@"
<fetch top='1'>
  <entity name='role'>
    <attribute name='roleid' />
    <filter>
      <condition attribute='name' operator='eq' value='{SecurityElement.Escape(roleName)}' />
    </filter>
    <link-entity name='teamroles' from='roleid' to='roleid' intersect='true'>
      <link-entity name='teammembership' from='teamid' to='teamid' intersect='true'>
        <filter>
          <condition attribute='systemuserid' operator='eq' value='{userId:D}' />
        </filter>
      </link-entity>
    </link-entity>
  </entity>
</fetch>";

            return _service.RetrieveMultiple(new FetchExpression(fetchXml)).Entities.Count > 0;
        }
    }
}
