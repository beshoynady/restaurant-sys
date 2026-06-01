/**
 * ==========================================
 * Delivery Area Form Modal (FULL EDIT MODE)
 * ------------------------------------------
 * Supports:
 * - Create / Edit
 * - Multilingual name (EN/AR)
 * - Full schema mapping
 * - Ready for API integration
 * ==========================================
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function DeliveryAreaFormModal({ data, onClose, onSave }) {
  const { t } = useTranslation();

  const isEditMode = Boolean(data?._id);

  // ==============================
  // FORM STATE (matches schema)
  // ==============================
  const [form, setForm] = useState({
    nameEn: "",
    nameAr: "",
    code: "",
    deliveryFee: 0,
    minimumOrderAmount: 0,
    freeDeliveryThreshold: "",
    estimatedDeliveryTime: "",
    maxDeliveryDistance: "",
    isActive: true,
  });

  // ==============================
  // LOAD DATA IN EDIT MODE
  // ==============================
  useEffect(() => {
    if (isEditMode) {
      setForm({
        nameEn: data?.name?.en || "",
        nameAr: data?.name?.ar || "",
        code: data?.code || "",
        deliveryFee: data?.deliveryFee || 0,
        minimumOrderAmount: data?.minimumOrderAmount || 0,
        freeDeliveryThreshold: data?.freeDeliveryThreshold ?? "",
        estimatedDeliveryTime: data?.estimatedDeliveryTime ?? "",
        maxDeliveryDistance: data?.maxDeliveryDistance ?? "",
        isActive: data?.isActive ?? true,
      });
    }
  }, [data]);

  // ==============================
  // HANDLE CHANGE
  // ==============================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = () => {
    const payload = {
      name: {
        en: form.nameEn,
        ar: form.nameAr,
      },
      code: form.code,
      deliveryFee: Number(form.deliveryFee),
      minimumOrderAmount: Number(form.minimumOrderAmount),
      freeDeliveryThreshold:
        form.freeDeliveryThreshold === ""
          ? null
          : Number(form.freeDeliveryThreshold),

      estimatedDeliveryTime:
        form.estimatedDeliveryTime === ""
          ? null
          : Number(form.estimatedDeliveryTime),

      maxDeliveryDistance:
        form.maxDeliveryDistance === ""
          ? null
          : Number(form.maxDeliveryDistance),

      isActive: form.isActive,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEditMode ? t("common.edit") : t("common.add")}
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* FORM GRID */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* NAME EN */}
          <Input
            label="Name (EN)"
            name="nameEn"
            value={form.nameEn}
            onChange={handleChange}
          />

          {/* NAME AR */}
          <Input
            label="Name (AR)"
            name="nameAr"
            value={form.nameAr}
            onChange={handleChange}
          />

          {/* CODE */}
          <Input
            label="Code"
            name="code"
            value={form.code}
            onChange={handleChange}
          />

          {/* DELIVERY FEE */}
          <Input
            label="Delivery Fee"
            name="deliveryFee"
            type="number"
            value={form.deliveryFee}
            onChange={handleChange}
          />

          {/* MIN ORDER */}
          <Input
            label="Minimum Order"
            name="minimumOrderAmount"
            type="number"
            value={form.minimumOrderAmount}
            onChange={handleChange}
          />

          {/* FREE DELIVERY */}
          <Input
            label="Free Delivery Threshold"
            name="freeDeliveryThreshold"
            type="number"
            value={form.freeDeliveryThreshold}
            onChange={handleChange}
          />

          {/* ESTIMATED TIME */}
          <Input
            label="Estimated Delivery Time (min)"
            name="estimatedDeliveryTime"
            type="number"
            value={form.estimatedDeliveryTime}
            onChange={handleChange}
          />

          {/* MAX DISTANCE */}
          <Input
            label="Max Distance (km)"
            name="maxDeliveryDistance"
            type="number"
            value={form.maxDeliveryDistance}
            onChange={handleChange}
          />
        </div>

        {/* ACTIVE TOGGLE */}
        <div className="mt-5 flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
          />
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Active Area
          </label>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-200 px-4 py-2"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleSubmit}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Input Component
 */
function Input({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>

      <input
        {...props}
        className="w-full rounded-xl border p-2 text-sm outline-none dark:bg-gray-800"
      />
    </div>
  );
}
