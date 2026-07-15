import throwError from "../../../utils/throwError.js";

/**
 * Enterprise Restaurant Operations Platform — Modifier Engine. The real business-rule
 * enforcement `Product.extras[]` never had: a `modifierGroups[]` group marked `required` or with
 * a nonzero `minSelection` MUST be satisfied, and `maxSelection` MUST NOT be exceeded, before an
 * order can be created — not left to the frontend or POS client to enforce (this platform's
 * standing "frontend must never own business rules" discipline). A single shared function so
 * order creation and any future caller (a cart-preview/price-quote endpoint, for example) can
 * never validate this differently.
 *
 * `product` must be the full product document (or a lean object) with `modifierGroups[]`
 * populated — callers are expected to fetch it themselves; this function does no DB access of its
 * own, keeping it a pure, easily-testable business rule.
 */
export function validateModifierSelections(product, selectedModifiers) {
  const groups = product?.modifierGroups || [];
  if (groups.length === 0) return;

  const selections = selectedModifiers || [];

  const countByGroup = {};
  for (const selection of selections) {
    const key = String(selection.modifierGroup);
    countByGroup[key] = (countByGroup[key] || 0) + (selection.quantity || 1);
  }

  for (const group of groups) {
    const groupId = String(group._id);
    const count = countByGroup[groupId] || 0;
    const groupName = group.name instanceof Map ? group.name.get("en") : group.name?.en;
    const label = groupName || groupId;

    const effectiveMin = group.required ? Math.max(group.minSelection || 0, 1) : group.minSelection || 0;
    if (count < effectiveMin) {
      throwError(`Modifier group "${label}" requires at least ${effectiveMin} selection(s), got ${count}.`, 400);
    }
    if (group.maxSelection && count > group.maxSelection) {
      throwError(`Modifier group "${label}" allows at most ${group.maxSelection} selection(s), got ${count}.`, 400);
    }

    // Every submitted option for this group must actually be a configured option of that group —
    // otherwise a client could snapshot an arbitrary product/priceDelta pair as if it were a real
    // modifier choice.
    const validOptionIds = new Set((group.options || []).map((opt) => String(opt.product)));
    for (const selection of selections) {
      if (String(selection.modifierGroup) !== groupId) continue;
      if (!validOptionIds.has(String(selection.product))) {
        throwError(`"${selection.product}" is not a configured option of modifier group "${label}".`, 400);
      }
    }
  }

  // Every selection must reference an actual group on this product — catches a stale/foreign
  // modifierGroup id (e.g. copied from a different product) rather than silently accepting it.
  const validGroupIds = new Set(groups.map((g) => String(g._id)));
  for (const selection of selections) {
    if (!validGroupIds.has(String(selection.modifierGroup))) {
      throwError(`"${selection.modifierGroup}" is not a modifier group on this product.`, 400);
    }
  }
}
