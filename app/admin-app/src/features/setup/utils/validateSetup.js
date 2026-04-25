
/* =====================================
   📁 features/setup/utils/validateSetup.js
===================================== */

export const validateSetup = (form) => {
  if (!form.brand.name.EN) return "Brand English name required";
  if (!form.owner.username) return "Owner username required";
  if (!form.owner.password) return "Owner password required";
  if (!form.branch.name.EN) return "Branch name required";
  return null;
};
