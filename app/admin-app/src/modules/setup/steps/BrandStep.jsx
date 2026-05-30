// src/modules/setup/steps/BrandStep.jsx

import { useState } from "react";
import { useTranslation } from "react-i18next";

import FormField from "../../../shared/ui/FormField.jsx";
import StepActions from "../../../shared/ui/StepActions";

export default function BrandStep({ data, update, onNext, onBack }) {
  const { t, i18n } = useTranslation();

  const lang = i18n.language;

  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.brand?.name?.en) {
      err.nameEN = true;
    }

    if (!data?.brand?.name?.ar) {
      err.nameAR = true;
    }

    if (!data?.brand?.legalName) {
      err.legalName = true;
    }

    setErrors(err);

    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {t("brandInformation")}
        </h2>

        <p className="text-sm text-gray-500">{t("brandDescription")}</p>
      </div>

      {/* BRAND NAME EN */}

      <FormField
        label={t("brandNameEN")}
        value={data?.brand?.name?.en}
        onChange={(e) => update("brand.name.en", e.target.value)}
        error={errors.nameEN}
        lang={lang}
        required
      />

      {/* BRAND NAME AR */}

      <FormField
        label={t("brandNameAR")}
        value={data?.brand?.name?.ar}
        onChange={(e) => update("brand.name.ar", e.target.value)}
        error={errors.nameAR}
        lang={lang}
        required
      />

      {/* LEGAL NAME */}

      <FormField
        label={t("legalName")}
        value={data?.brand?.legalName}
        onChange={(e) => update("brand.legalName", e.target.value)}
        error={errors.legalName}
        lang={lang}
        required
      />

      {/* LOGO */}

      <FormField
        label={t("logoUrl")}
        value={data?.brand?.logo}
        onChange={(e) => update("brand.logo", e.target.value)}
        lang={lang}
      />

      {/* ACTIONS */}

      <StepActions onBack={onBack} onNext={() => validate() && onNext()} />
    </div>
  );
}
