import { Select } from "@mantine/core";
import { hasRole, superAdminRole } from "@bjcp-arena/contracts";
import { roleOptions } from "../../../utils/roles.js";

export function RoleSelect({
  disabledSuperAdminRemoval,
  label = "角色",
  value,
  onChange,
}: {
  disabledSuperAdminRemoval?: boolean;
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Select
      allowDeselect={false}
      data={roleOptions.map((option) => {
        const optionHasSuperAdmin = hasRole(option.value, superAdminRole);
        return {
          disabled: disabledSuperAdminRemoval === true && !optionHasSuperAdmin,
          label: option.label,
          value: String(option.value),
        };
      })}
      label={label}
      value={String(value)}
      onChange={(nextValue) => {
        if (nextValue) {
          onChange(Number(nextValue));
        }
      }}
    />
  );
}
