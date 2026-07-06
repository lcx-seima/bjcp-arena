import { Checkbox, Typography } from "antd";
import { adminRole, hasRole, judgeRole, superAdminRole } from "@bjcp-arena/contracts";

export function RoleCheckboxGroup({
  disabledSuperAdminRemoval = false,
  value = 0,
  onChange,
}: {
  disabledSuperAdminRemoval?: boolean;
  value?: number;
  onChange?: (value: number) => void;
}) {
  const hasSuperAdmin = hasRole(value, superAdminRole);
  const preventSuperAdminRemoval = disabledSuperAdminRemoval && hasSuperAdmin;

  function handleRoleChange(role: number, checked: boolean) {
    let nextValue = checked ? value | role : value & ~role;

    if (checked && role === superAdminRole) {
      nextValue &= ~adminRole;
    }
    if (checked && role === adminRole) {
      nextValue &= ~superAdminRole;
    }

    onChange?.(nextValue);
  }

  return (
    <div className="stack-xs">
      <div className="role-grid">
        <Checkbox
          checked={hasSuperAdmin}
          disabled={preventSuperAdminRemoval}
          onChange={(event) => handleRoleChange(superAdminRole, event.target.checked)}
        >
          超级管理员
        </Checkbox>
        <Checkbox
          checked={hasRole(value, adminRole)}
          disabled={preventSuperAdminRemoval}
          onChange={(event) => handleRoleChange(adminRole, event.target.checked)}
        >
          赛事管理员
        </Checkbox>
        <Checkbox
          checked={hasRole(value, judgeRole)}
          onChange={(event) => handleRoleChange(judgeRole, event.target.checked)}
        >
          裁判员
        </Checkbox>
      </div>
      <Typography.Text type="secondary">超级管理员和赛事管理员互斥，裁判员可叠加。</Typography.Text>
    </div>
  );
}
