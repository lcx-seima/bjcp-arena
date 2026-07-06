import { type ReactNode } from "react";

export function MobileShell({
  back,
  bottomAction,
  children,
  description,
  rightAction,
  title,
}: {
  back?: {
    label?: string;
    onClick: () => void;
  };
  bottomAction?: ReactNode;
  children: ReactNode;
  description?: string;
  rightAction?: ReactNode;
  title: string;
}) {
  return (
    <section className={bottomAction ? "mobile-shell mobile-shell--with-bottom" : "mobile-shell"}>
      <header className="mobile-shell__top">
        <div className="mobile-shell__side">
          {back ? (
            <button
              aria-label={back.label ?? "返回"}
              className="mobile-shell__back"
              type="button"
              onClick={back.onClick}
            >
              <span aria-hidden="true">‹</span>
            </button>
          ) : null}
        </div>

        <div className="mobile-shell__title">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>

        <div className="mobile-shell__side mobile-shell__side--end">{rightAction}</div>
      </header>

      <div className="mobile-shell__content">
        <div className="mobile-shell__body">{children}</div>
      </div>

      {bottomAction ? <footer className="mobile-shell__bottom">{bottomAction}</footer> : null}
    </section>
  );
}
