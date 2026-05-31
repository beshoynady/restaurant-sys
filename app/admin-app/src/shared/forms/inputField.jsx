// src/shared/forms/inputField.jsx
import React from "react";

export const FormInput = ({
  label,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">
        {label}
      </label>

      <input
        {...props}
        className="border p-2 rounded focus:outline-blue-500"
      />
    </div>
  );
};