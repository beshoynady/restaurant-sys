// src/modules/setup/steps/BranchStep.jsx

import { useState } from "react";
import { useTranslation } from "react-i18next";

import FormField from "../../../shared/ui/form/FormField.jsx";
import StepActions from "../../../shared/ui/button/StepActions.jsx";

export default function BranchStep({ data, update, onNext, onBack }) {
  const { t, i18n } = useTranslation();

  const lang = i18n.language;

  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.branch?.name?.en) {
      err.nameEN = true;
    }

    if (!data?.branch?.name?.ar) {
      err.nameAR = true;
    }

    if (!data?.branch?.address?.en?.country) {
      err.country = true;
    }

    if (!data?.branch?.address?.en?.city) {
      err.city = true;
    }

    if (!data?.branch?.address?.en?.area) {
      err.area = true;
    }

    if (!data?.branch?.address?.en?.street) {
      err.street = true;
    }

    if (!data?.branch?.address?.ar?.country) {
      err.countryAR = true;
    }

    if (!data?.branch?.address?.ar?.city) {
      err.cityAR = true;
    }

    if (!data?.branch?.address?.ar?.area) {
      err.areaAR = true;
    }

    if (!data?.branch?.address?.ar?.street) {
      err.streetAR = true;
    }

    setErrors(err);

    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h2 className="text-2xl font-bold">{t("mainBranch")}</h2>
      </div>

      {/* BRANCH NAME */}

      <FormField
        label={t("branchNameEN")}
        value={data?.branch?.name?.en}
        onChange={(e) => update("branch.name.en", e.target.value)}
        error={errors.nameEN}
        lang={lang}
        required
      />

      <FormField
        label={t("branchNameAR")}
        value={data?.branch?.name?.ar}
        onChange={(e) => update("branch.name.ar", e.target.value)}
        error={errors.nameAR}
        lang={lang}
        required
      />

      {/* ADDRESS EN */}

      <h3 className="text-lg font-semibold">{t("addressEN")}</h3>

      <FormField
        label={t("country")}
        value={data?.branch?.address?.en?.country}
        onChange={(e) => update("branch.address.en.country", e.target.value)}
        error={errors.country}
        lang={lang}
        required
      />

      <FormField
        label={t("city")}
        value={data?.branch?.address?.en?.city}
        onChange={(e) => update("branch.address.en.city", e.target.value)}
        error={errors.city}
        lang={lang}
        required
      />

      <FormField
        label={t("area")}
        value={data?.branch?.address?.en?.area}
        onChange={(e) => update("branch.address.en.area", e.target.value)}
        error={errors.area}
        lang={lang}
        required
      />

      <FormField
        label={t("street")}
        value={data?.branch?.address?.en?.street}
        onChange={(e) => update("branch.address.en.street", e.target.value)}
        error={errors.street}
        lang={lang}
        required
      />

      {/* ADDRESS AR */}

      <h3 className="text-lg font-semibold">{t("addressAR")}</h3>

      <FormField
        label={t("country")}
        value={data?.branch?.address?.ar?.country}
        onChange={(e) => update("branch.address.ar.country", e.target.value)}
        error={errors.countryAR}
        lang={lang}
        required
      />

      <FormField
        label={t("city")}
        value={data?.branch?.address?.ar?.city}
        onChange={(e) => update("branch.address.ar.city", e.target.value)}
        error={errors.cityAR}
        lang={lang}
        required
      />

      <FormField
        label={t("area")}
        value={data?.branch?.address?.ar?.area}
        onChange={(e) => update("branch.address.ar.area", e.target.value)}
        error={errors.areaAR}
        lang={lang}
        required
      />

      <FormField
        label={t("street")}
        value={data?.branch?.address?.ar?.street}
        onChange={(e) => update("branch.address.ar.street", e.target.value)}
        error={errors.streetAR}
        lang={lang}
        required
      />

      {/* OPTIONAL */}

      <FormField
        label={t("postalCode")}
        value={data?.branch?.postalCode}
        onChange={(e) => update("branch.postalCode", e.target.value)}
        lang={lang}
      />

      <FormField
        label={t("taxId")}
        value={data?.branch?.taxIdentificationNumber}
        onChange={(e) =>
          update("branch.taxIdentificationNumber", e.target.value)
        }
        lang={lang}
      />

      {/* ACTIONS */}

      <StepActions onBack={onBack} onNext={() => validate() && onNext()} />
    </div>
  );
}
