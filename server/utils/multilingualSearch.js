// Centralized multilingual search-query builder. Previously three separate
// spots (brand.repository.js#searchBrands, branch.repository.js's
// searchableFields + getAllBranches's custom $or block,
// delivery-area.repository.js's searchableFields) each hardcoded a
// ["name.EN", "name.AR"] pair — any brand/branch/area named only in a third
// supported language (FR/ES/IT/ZH/JA/RU, per utils/languages.js) was
// unsearchable by that name, despite the model itself accepting it.
// Builds a Mongo $or clause matching `value` (regex-escaped, case-
// insensitive) against every language key of a multilingual Map field, for
// every entry in SUPPORTED_LANGUAGES — the platform's single definition of
// "which languages are supported" — instead of a hardcoded subset.
import { SUPPORTED_LANGUAGES } from "./languages.js";
import escapeRegex from "./regex.js";

export const buildMultilingualRegexMatch = (field, value) => {
  const keyword = escapeRegex(String(value).trim());

  return SUPPORTED_LANGUAGES.map((lang) => ({
    [`${field}.${lang}`]: { $regex: keyword, $options: "i" },
  }));
};

// searchableFields config for modules whose *inherited* BaseRepository.getAll()
// search still runs against a multilingual Map field — e.g. `name` — plus
// any number of plain (non-multilingual) fields.
export const multilingualSearchableFields = (field, ...plainFields) => [
  ...SUPPORTED_LANGUAGES.map((lang) => `${field}.${lang}`),
  ...plainFields,
];

export default buildMultilingualRegexMatch;
