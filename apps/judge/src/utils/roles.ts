import { hasRole, roleLabels, userRoleValues } from "@bjcp-arena/contracts";

export function describeRoles(roles: number) {
  const labels = userRoleValues
    .filter((role) => hasRole(roles, role))
    .map((role) => roleLabels[role]);

  return labels.length > 0 ? labels.join("、") : "未配置";
}
