import clsx from "clsx";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",

    secondary:
      "bg-surface text-foreground border border-border hover:bg-surface-secondary",

    danger: "bg-danger text-white",

    ghost: "bg-transparent text-foreground hover:bg-surface",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
