// features/setup/utils/mapPayload.js

export const mapPayload = (form) => {
  return {
    brand: {
      ...form.brand,
      currency: {
        code: form.brand.currency,
      },
    },
    owner: form.owner,
    branch: form.branch,
  };
};