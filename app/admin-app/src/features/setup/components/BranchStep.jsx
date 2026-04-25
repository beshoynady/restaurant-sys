
/* =====================================
   📁 features/setup/components/BranchStep.jsx
===================================== */

export const BranchStep = ({ form, update }) => {
  return (
    <div>
      <input placeholder="Branch EN" value={form.branch.name.EN}
        onChange={(e) => update("branch.name.EN", e.target.value)} />

      <input placeholder="Branch AR" value={form.branch.name.AR}
        onChange={(e) => update("branch.name.AR", e.target.value)} />
    </div>
  );
};

