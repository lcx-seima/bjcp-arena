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
    <table className="info-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td style={{ overflowWrap: "anywhere" }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
