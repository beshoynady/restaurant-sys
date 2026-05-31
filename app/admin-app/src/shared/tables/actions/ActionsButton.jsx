// src/shared/tables/actions/ActionsButton.jsx
import React from "react";
import { useTranslation} from "react-i18next";

export default function ActionsButton({
  label,
  icon,
  variant = "danger",
  onClick,
  disabled = false,
  type = "button",
}) {
  const { t } = useTranslation();

  const variants = {
    danger: "bg-red-600 hover:bg-red-700",
    success: "bg-green-600 hover:bg-green-700",
    primary: "bg-blue-600 hover:bg-blue-700",
    warning: "bg-yellow-500 hover:bg-yellow-600",
    info: "bg-cyan-600 hover:bg-cyan-700",
    gray: "bg-gray-600 hover:bg-gray-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        text-white px-4 py-2 rounded
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
        transition-all duration-200
      `}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {t(label)}
    </button>
  );
}
