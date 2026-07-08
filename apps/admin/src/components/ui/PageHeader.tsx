import { Typography } from "antd";
import type { ReactNode } from "react";

const { Text, Title } = Typography;

export function PageHeader({
  eyebrow,
  title,
  titleExtra,
  description,
}: {
  eyebrow?: string | undefined;
  title: string;
  titleExtra?: ReactNode | undefined;
  description?: ReactNode | undefined;
}) {
  return (
    <div className="page-header">
      {eyebrow ? (
        <Text className="page-header__eyebrow" type="secondary">
          {eyebrow}
        </Text>
      ) : null}
      <Title level={3} style={{ margin: 0, overflowWrap: "anywhere" }}>
        <span className="page-header__title">
          <span>{title}</span>
          {titleExtra ? <span className="page-header__title-extra">{titleExtra}</span> : null}
        </span>
      </Title>
      {description ? (
        typeof description === "string" ? (
          <Text style={{ overflowWrap: "anywhere" }} type="secondary">
            {description}
          </Text>
        ) : (
          description
        )
      ) : null}
    </div>
  );
}
