// src/shared/ui/layout/PageHeader.jsx
/**
 * Standard page header for all modules
 */

export default function PageHeader({
  title,
  description,
  right,
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {right && <div>{right}</div>}
    </div>
  );
}