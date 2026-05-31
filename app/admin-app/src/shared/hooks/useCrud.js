import { useState } from "react";

export default function useCrud(initialData = []) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]);

  // ===== CREATE =====
  const createItem = (item) => {
    setData((prev) => [
      ...prev,
      { ...item, _id: Date.now().toString() },
    ]);
  };

  // ===== UPDATE =====
  const updateItem = (updatedItem) => {
    setData((prev) =>
      prev.map((item) =>
        item._id === updatedItem._id ? updatedItem : item
      )
    );
  };

  // ===== DELETE =====
  const deleteItem = (id) => {
    setData((prev) => prev.filter((item) => item._id !== id));
  };

  // ===== DELETE SELECTED =====
  const deleteSelected = () => {
    setData((prev) =>
      prev.filter((item) => !selectedRows.includes(item._id))
    );
    setSelectedRows([]);
  };

  // ===== SELECT ROW =====
  const toggleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = (ids) => {
    setSelectedRows(ids);
  };

  return {
    data,
    setData,
    loading,
    setLoading,

    selectedRows,
    setSelectedRows,

    createItem,
    updateItem,
    deleteItem,
    deleteSelected,

    toggleSelectRow,
    selectAll,
  };
}