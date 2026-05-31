// src/shared/tables/modals/EntityFormModal.jsx
import React from "react";
import FormModal from "./FormModal";
import { FormInput } from "../../forms/inputField";

export default function EntityFormModal({
  open,
  title,
  onClose,
  onSubmit,
  schema = [],
  form,
  setForm,
  loading = false,
}) {
  return (
    <FormModal
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={loading}
    >
      {schema.map((field) => {
        if (field.type === "text" || field.type === "number") {
          return (
            <FormInput
              key={field.name}
              label={field.label}
              type={field.type}
              value={form[field.name]}
              onChange={(e) =>
                setForm({
                  ...form,
                  [field.name]:
                    field.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-600">
                {field.label}
              </label>

              <select
                value={form[field.name]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.name]: e.target.value,
                  })
                }
                className="border p-2 rounded"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return null;
      })}
    </FormModal>
  );
}