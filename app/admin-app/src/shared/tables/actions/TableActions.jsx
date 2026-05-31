// src/shared/tables/actions/TableActions.jsx
import React from "react";
import ActionsButton from "./ActionsButton";

export default function TableActions({
  onCreate,
  onExport,
  onPrint,
  onDeleteSelected,
  selectedCount = 0,
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center justify-between w-full">

      <div className="flex gap-2">
        {onCreate && (
          <ActionsButton
            label="+ Add"
            variant="success"
            onClick={onCreate}
          />
        )}

        {onExport && (
          <ActionsButton
            label="Export"
            variant="primary"
            onClick={onExport}
          />
        )}

        {onPrint && (
          <ActionsButton
            label="Print"
            variant="info"
            onClick={onPrint}
          />
        )}
      </div>

      {selectedCount > 0 && (
        <ActionsButton
          label={`Delete (${selectedCount})`}
          variant="danger"
          onClick={onDeleteSelected}
        />
      )}

    </div>
  );
}