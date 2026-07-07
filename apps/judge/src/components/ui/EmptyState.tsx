type EmptyStateProps = {
  subTitle?: string;
  title?: string;
};

export function EmptyState({ subTitle, title = "暂无数据" }: EmptyStateProps) {
  return (
    <div className="empty-placeholder" role="status">
      <img
        alt=""
        aria-hidden="true"
        className="empty-placeholder__logo"
        src="/brand/empty-placeholder-logo.png"
      />
      <div className="empty-placeholder__copy">
        <p className="empty-placeholder__title">{title}</p>
        {subTitle ? <p className="empty-placeholder__subtitle">{subTitle}</p> : null}
      </div>
    </div>
  );
}
