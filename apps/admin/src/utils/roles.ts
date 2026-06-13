import { hasRole, roleLabels, superAdminRole, adminRole, judgeRole } from "@bjcp-arena/contracts";

export const roleOptions = [
  { label: "赛事管理员", value: adminRole },
  { label: "裁判员", value: judgeRole },
  { label: "管理员+裁判员", value: adminRole | judgeRole },
  { label: "超级管理员", value: superAdminRole },
  { label: "超级管理员+裁判员", value: superAdminRole | judgeRole },
] as const;

export function describeRoles(roles: number) {
  return [superAdminRole, adminRole, judgeRole]
    .filter((role) => hasRole(roles, role))
    .map((role) => roleLabels[role])
    .join("、");
}
