import clsx from "clsx";

/**
 * Reusable input component
 * Supports label + error + RTL ready
 */

export default function InputField({
  label,
  error,
  className,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm text-foreground">
          {label}
        </label>
      )}

      <input
        {...props}
        className={clsx(
          "w-full rounded-lg border bg-surface px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-primary",
          error
            ? "border-danger"
            : "border-border",
          className
        )}
      />

      {error && (
        <span className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}