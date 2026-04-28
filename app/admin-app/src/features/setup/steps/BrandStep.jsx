import { useState } from "react";
import FormField from "../../../components/ui/FormField";

export default function BrandStep({ data, update, onNext, onBack, lang }) {
  const isArabic = lang === "ar";
  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.brand?.name?.EN) err.nameEN = true;
    if (!data?.brand?.name?.AR) err.nameAR = true;
    if (!data?.brand?.legalName) err.legalName = true;

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {isArabic ? "بيانات العلامة التجارية" : "Brand Information"}
        </h2>

        <p className="text-sm text-gray-500">
          {isArabic
            ? "أدخل بيانات المطعم الأساسية"
            : "Enter your restaurant basic information"}
        </p>
      </div>

      {/* FIELDS */}

      <FormField
        label={isArabic ? "اسم العلامة (EN)" : "Brand Name (EN)"}
        value={data?.brand?.name?.EN}
        onChange={(e) => update("brand.name.EN", e.target.value)}
        error={errors.nameEN}
        lang={lang}
        required
      />

      <FormField
        label={isArabic ? "اسم العلامة (AR)" : "Brand Name (AR)"}
        value={data?.brand?.name?.AR}
        onChange={(e) => update("brand.name.AR", e.target.value)}
        error={errors.nameAR}
        lang={lang}
        required
      />

      <FormField
        label={isArabic ? "الاسم القانوني" : "Legal Name"}
        value={data?.brand?.legalName}
        onChange={(e) => update("brand.legalName", e.target.value)}
        error={errors.legalName}
        lang={lang}
        required
      />

      <FormField
        label="Logo URL"
        value={data?.brand?.logo}
        onChange={(e) => update("brand.logo", e.target.value)}
        lang={lang}
      />

      {/* ACTIONS */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="btn-secondary">
          {isArabic ? "رجوع" : "Back"}
        </button>

        <button onClick={() => validate() && onNext()} className="btn-primary">
          {isArabic ? "التالي" : "Next"}
        </button>
      </div>

    </div>
  );
}