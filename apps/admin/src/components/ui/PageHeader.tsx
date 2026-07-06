import { Typography } from "antd";

const { Text, Title } = Typography;

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string | undefined;
}) {
  return (
    <div className="page-header">
      <Text className="page-header__eyebrow" type="secondary">
        {eyebrow}
      </Text>
      <Title level={2} style={{ margin: 0 }}>
        {title}
      </Title>
      {description ? (
        <Text style={{ overflowWrap: "anywhere" }} type="secondary">
          {description}
        </Text>
      ) : null}
    </div>
  );
}
