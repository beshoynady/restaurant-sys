
/* =====================================
   📁 features/setup/utils/mapPayload.js
===================================== */

export const mapPayload = (form) => {
  return {
    brand: {
      name: form.brand.name,
      legalName: form.brand.legalName,
      currency: {
        code: form.brand.currency || "EGP",
      },
    },

    owner: {
      username: form.owner.username,
      password: form.owner.password,
      email: form.owner.email,
      phone: form.owner.phone,
    },

    branch: {
      name: form.branch.name,
    },
  };
};
