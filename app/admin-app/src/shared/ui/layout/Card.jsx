// src/shared/ui/layout/Card.jsx
import clsx from "clsx";
    

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-xl shadow-sm p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
