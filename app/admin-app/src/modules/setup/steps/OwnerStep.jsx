import { useState } from "react";
import FormField from "../../../components/ui/FormField";

export default function OwnerStep({ data, update, onNext, onBack, lang }) {
  const isArabic = lang === "ar";
  const [errors, setErrors] = useState({});

  const validate = () => {
    let err = {};

    if (!data?.owner?.username) err.username = true;
    if (!data?.owner?.password || data.owner.password.length < 6)
      err.password = true;

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold">
          {isArabic ? "حساب المالك" : "Owner Account"}
        </h2>

        <p className="text-sm text-gray-500">
          {isArabic
            ? "إنشاء حساب المدير الرئيسي"
            : "Create main admin account"}
        </p>
      </div>

      {/* FIELDS */}

      <FormField
        label={isArabic ? "اسم المستخدم" : "Username"}
        value={data?.owner?.username}
        onChange={(e) => update("owner.username", e.target.value)}
        error={errors.username}
        lang={lang}
        required
      />

      <FormField
        label={isArabic ? "كلمة المرور" : "Password"}
        type="password"
        value={data?.owner?.password}
        onChange={(e) => update("owner.password", e.target.value)}
        error={errors.password}
        lang={lang}
        required
      />

      <FormField
        label={isArabic ? "البريد الإلكتروني" : "Email"}
        value={data?.owner?.email}
        onChange={(e) => update("owner.email", e.target.value)}
        lang={lang}
      />

      <FormField
        label={isArabic ? "رقم الهاتف" : "Phone"}
        value={data?.owner?.phone}
        onChange={(e) => update("owner.phone", e.target.value)}
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