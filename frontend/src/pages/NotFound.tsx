import { ArrowLeft, Compass } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/Button";
import { useI18n } from "../i18n";

export function NotFoundPage() {
  const { t, pick } = useI18n();
  const location = useLocation();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft-bg">
        <Compass className="h-7 w-7 text-brand" aria-hidden="true" />
      </span>
      <p className="mt-5 font-mono text-sm font-semibold text-muted">404</p>
      <h1 className="mt-1 text-2xl font-bold text-brand">
        {pick("This page could not be found", "ಈ ಪುಟ ಕಂಡುಬಂದಿಲ್ಲ")}
      </h1>
      <p className="mt-2 break-all text-sm leading-relaxed text-ink-soft">
        {pick("The address", "ವಿಳಾಸ")} <code className="font-mono text-xs">{location.pathname}</code>{" "}
        {pick(
          "does not exist. Check the link or return to the public website.",
          "ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ. ಲಿಂಕ್ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಸಾರ್ವಜನಿಕ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಹಿಂತಿರುಗಿ.",
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/">
          <Button icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>{t("nav.backToSite")}</Button>
        </Link>
        <Link to="/track">
          <Button variant="secondary">{t("nav.track")}</Button>
        </Link>
      </div>
    </div>
  );
}
