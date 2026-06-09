// src/shared/ui/layout/SectionCard.jsx

import clsx from "clsx";
import Card from "./Card";

export default function SectionCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName,
}) {
  return (
    <Card className={clsx("rounded-3xl p-6", className)}>
      {(title || icon || actions) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              {icon}

              {title && (
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
            </div>

            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={clsx(contentClassName)}>{children}</div>
    </Card>
  );
}
