export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-header">
      <div className="page-header__eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
