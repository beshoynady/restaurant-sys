import { useState } from "react";
import FormField from "../../../components/ui/FormField";

export default function BranchStep({ data, update, onSubmit, onBack, lang }) {
  const isArabic = lang === "ar";
  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.branch?.name?.EN) err.nameEN = true;
    if (!data?.branch?.name?.AR) err.nameAR = true;

    if (!data?.branch?.address?.EN?.country) err.country = true;
    if (!data?.branch?.address?.EN?.city) err.city = true;
    if (!data?.branch?.address?.EN?.area) err.area = true;
    if (!data?.branch?.address?.EN?.street) err.street = true;

    if (!data?.branch?.address?.AR?.country) err.countryAR = true;
    if (!data?.branch?.address?.AR?.city) err.cityAR = true;
    if (!data?.branch?.address?.AR?.area) err.areaAR = true;
    if (!data?.branch?.address?.AR?.street) err.streetAR = true;

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold">
          {isArabic ? "الفرع الرئيسي" : "Main Branch"}
        </h2>
      </div>

      {/* NAME */}
      <FormField
        label="Branch Name (EN)"
        value={data?.branch?.name?.EN}
        onChange={(e) => update("branch.name.EN", e.target.value)}
        error={errors.nameEN}
        lang={lang}
        required
      />

      <FormField
        label="Branch Name (AR)"
        value={data?.branch?.name?.AR}
        onChange={(e) => update("branch.name.AR", e.target.value)}
        error={errors.nameAR}
        lang={lang}
        required
      />

      {/* ADDRESS EN */}
      <h3 className="text-lg font-semibold">Address (EN)</h3>

      <FormField
        label="Country"
        value={data?.branch?.address?.EN?.country}
        onChange={(e) => update("branch.address.EN.country", e.target.value)}
        error={errors.country}
        lang={lang}
        required
      />

      <FormField
        label="City"
        value={data?.branch?.address?.EN?.city}
        onChange={(e) => update("branch.address.EN.city", e.target.value)}
        error={errors.city}
        lang={lang}
        required
      />

      <FormField
        label="Area"
        value={data?.branch?.address?.EN?.area}
        onChange={(e) => update("branch.address.EN.area", e.target.value)}
        error={errors.area}
        lang={lang}
        required
      />

      <FormField
        label="Street"
        value={data?.branch?.address?.EN?.street}
        onChange={(e) => update("branch.address.EN.street", e.target.value)}
        error={errors.street}
        lang={lang}
        required
      />

      {/* ADDRESS AR */}
      <h3 className="text-lg font-semibold">Address (AR)</h3>

      <FormField
        label="الدولة"
        value={data?.branch?.address?.AR?.country}
        onChange={(e) => update("branch.address.AR.country", e.target.value)}
        error={errors.countryAR}
        lang={lang}
        required
      />

      <FormField
        label="المدينة"
        value={data?.branch?.address?.AR?.city}
        onChange={(e) => update("branch.address.AR.city", e.target.value)}
        error={errors.cityAR}
        lang={lang}
        required
      />

      <FormField
        label="المنطقة"
        value={data?.branch?.address?.AR?.area}
        onChange={(e) => update("branch.address.AR.area", e.target.value)}
        error={errors.areaAR}
        lang={lang}
        required
      />

      <FormField
        label="الشارع"
        value={data?.branch?.address?.AR?.street}
        onChange={(e) => update("branch.address.AR.street", e.target.value)}
        error={errors.streetAR}
        lang={lang}
        required
      />

      {/* OPTIONAL */}
      <FormField
        label="Postal Code"
        value={data?.branch?.postalCode}
        onChange={(e) => update("branch.postalCode", e.target.value)}
        lang={lang}
      />

      <FormField
        label="Tax ID"
        value={data?.branch?.taxIdentificationNumber}
        onChange={(e) =>
          update("branch.taxIdentificationNumber", e.target.value)
        }
        lang={lang}
      />

      {/* ACTIONS */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="btn-secondary">
          {isArabic ? "رجوع" : "Back"}
        </button>

        <button onClick={() => validate() && onSubmit()} className="btn-primary">
          {isArabic ? "إنهاء" : "Finish"}
        </button>
      </div>

    </div>
  );
}