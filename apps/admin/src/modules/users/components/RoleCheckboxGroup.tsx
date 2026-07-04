import { Checkbox, SimpleGrid, Stack, Text } from "@mantine/core";
import { adminRole, hasRole, judgeRole, superAdminRole } from "@bjcp-arena/contracts";

export function RoleCheckboxGroup({
  disabledSuperAdminRemoval = false,
  value,
  onChange,
}: {
  disabledSuperAdminRemoval?: boolean;
  value: number;
  onChange: (value: number) => void;
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

    onChange(nextValue);
  }

  return (
    <Stack gap={6}>
      <Text c="dimmed" fw={700} size="sm">
        角色
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
        <Checkbox
          checked={hasSuperAdmin}
          disabled={preventSuperAdminRemoval}
          label="超级管理员"
          onChange={(event) => handleRoleChange(superAdminRole, event.currentTarget.checked)}
        />
        <Checkbox
          checked={hasRole(value, adminRole)}
          disabled={preventSuperAdminRemoval}
          label="赛事管理员"
          onChange={(event) => handleRoleChange(adminRole, event.currentTarget.checked)}
        />
        <Checkbox
          checked={hasRole(value, judgeRole)}
          label="裁判员"
          onChange={(event) => handleRoleChange(judgeRole, event.currentTarget.checked)}
        />
      </SimpleGrid>
      <Text c="dimmed" size="xs">
        超级管理员和赛事管理员互斥，裁判员可叠加。
      </Text>
    </Stack>
  );
}
