// src/modules/setup/steps/OwnerStep.jsx

import { useState } from "react";
import { useTranslation } from "react-i18next";

import FormField from "../../../shared/ui/FormField.jsx";
import StepActions from "../../../shared/ui/StepActions";

export default function OwnerStep({
  data,
  update,
  onSubmit,
  onBack,
  isSubmitting,
}) {
  const { t, i18n } = useTranslation();

  const lang = i18n.language;

  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.owner?.username) {
      err.username = true;
    }

    if (!data?.owner?.password || data.owner.password.length < 6) {
      err.password = true;
    }

    setErrors(err);

    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold">{t("ownerAccount")}</h2>

        <p className="text-sm text-gray-500">{t("ownerDescription")}</p>
      </div>
      {/* USERNAME */}
      <FormField
        label={t("username")}
        value={data?.owner?.username}
        onChange={(e) => update("owner.username", e.target.value)}
        error={errors.username}
        lang={lang}
        required
      />
      {/* PASSWORD */}
      <FormField
        label={t("password")}
        type="password"
        value={data?.owner?.password}
        onChange={(e) => update("owner.password", e.target.value)}
        error={errors.password}
        lang={lang}
        required
      />
      {/* EMAIL */}
      <FormField
        label={t("email")}
        value={data?.owner?.email}
        onChange={(e) => update("owner.email", e.target.value)}
        lang={lang}
      />
      {/* PHONE */}
      <FormField
        label={t("phone")}
        value={data?.owner?.phone}
        onChange={(e) => update("owner.phone", e.target.value)}
        lang={lang}
      />
      {/* ACTIONS */}
      <StepActions
        onBack={onBack}
        onNext={() => validate() && onSubmit()}
        nextLabel={t("finish")}
        loading={isSubmitting}
      />{" "}
    </div>
  );
}
