// Single canonical regex-escaping helper. Previously duplicated privately
// inside utils/BaseRepository.js, with two other repositories
// (brand.repository.js#searchBrands, branch.repository.js#getAllBranches)
// building $regex queries directly from unescaped user input — a
// regex-injection / ReDoS risk (confirmed in the Organization Final Audit).
// Every raw $regex query in the codebase should escape through this one
// function so there is exactly one place that can go wrong, not several.
export const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
