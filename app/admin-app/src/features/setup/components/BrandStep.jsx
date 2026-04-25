

/* =====================================
   📁 features/setup/components/BrandStep.jsx
===================================== */

export const BrandStep = ({ form, update }) => {
  return (
    <div>
      <input placeholder="Brand EN" value={form.brand.name.EN}
        onChange={(e) => update("brand.name.EN", e.target.value)} />

      <input placeholder="Brand AR" value={form.brand.name.AR}
        onChange={(e) => update("brand.name.AR", e.target.value)} />

      <input placeholder="Legal Name" value={form.brand.legalName}
        onChange={(e) => update("brand.legalName", e.target.value)} />
    </div>
  );
};
