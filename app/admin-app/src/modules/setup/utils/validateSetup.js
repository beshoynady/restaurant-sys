// features/setup/utils/validateSetup.js

export const validateSetup = (form) => {
  if (!form.brand.name.EN) return "Brand name is required";
  if (!form.owner.username) return "Username is required";
  if (!form.owner.password) return "Password is required";
  if (!form.branch.name.EN) return "Branch name is required";

  return null;
};