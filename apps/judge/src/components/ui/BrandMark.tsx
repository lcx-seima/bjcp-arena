import { judgeBrand } from "../../app/theme.js";

export function BrandMark({
  subtitle,
  variant = "compact",
}: {
  subtitle?: string;
  variant?: "compact" | "hero";
}) {
  return (
    <section className={`brand-mark brand-mark--${variant}`} aria-label={judgeBrand.name}>
      <img className="brand-mark__logo" src={judgeBrand.logoSrc} alt={judgeBrand.name} />
      <div className="brand-mark__copy">
        <div className="brand-mark__name">{judgeBrand.name}</div>
        <div className="brand-mark__tagline">{subtitle ?? judgeBrand.tagline}</div>
      </div>
    </section>
  );
}
