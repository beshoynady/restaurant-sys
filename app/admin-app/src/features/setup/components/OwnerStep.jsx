
/* =====================================
   📁 features/setup/components/OwnerStep.jsx
===================================== */

export const OwnerStep = ({ form, update }) => {
  return (
    <div>
      <input placeholder="Username" value={form.owner.username}
        onChange={(e) => update("owner.username", e.target.value)} />

      <input placeholder="Password" type="password" value={form.owner.password}
        onChange={(e) => update("owner.password", e.target.value)} />

      <input placeholder="Email" value={form.owner.email}
        onChange={(e) => update("owner.email", e.target.value)} />

      <input placeholder="Phone" value={form.owner.phone}
        onChange={(e) => update("owner.phone", e.target.value)} />
    </div>
  );
};

