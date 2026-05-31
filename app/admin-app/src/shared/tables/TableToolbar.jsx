// src/shared/tables/TableToolbar.jsx
import React from "react";

const TableToolbar = ({
  title,
  description,
  leftContent,
  rightContent,
  children,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left Section */}
        <div className="flex flex-col">
          {title && (
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          )}

          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}

          {leftContent}
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-2">{rightContent}</div>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default TableToolbar;
