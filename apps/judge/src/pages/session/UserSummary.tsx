import { Stack, Table } from "@mantine/core";
import { type UserPublic } from "@bjcp-arena/contracts";
import { describeRoles } from "../../utils/roles.js";

export function UserSummary({ user, apiBaseUrl }: { user: UserPublic; apiBaseUrl?: string }) {
  const rows = [
    ["昵称", user.nickname],
    ["用户名", user.username],
    ["角色", describeRoles(user.roles)],
    ...(apiBaseUrl ? [["API 地址", apiBaseUrl]] : []),
  ];

  return (
    <Stack gap="xs">
      <Table withColumnBorders withTableBorder>
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Th w={96}>{label}</Table.Th>
              <Table.Td style={{ overflowWrap: "anywhere" }}>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
