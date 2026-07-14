import RoleTemplateModel from "./role-template.model.js";
import RoleModel from "../role/role.model.js";
import throwError from "../../../utils/throwError.js";
import { expandDomainGrantsToPermissions } from "./role-domain-groups.js";
import { ROLE_TEMPLATE_SEED, HR_TEMPLATE_IAM_OVERRIDE } from "./role-template.seed.js";

class RoleTemplateService {
  /**
   * Idempotent upsert of the platform's static template catalog, by `key`. Safe to call on every
   * server boot (unlike tenant data, this is a shared, global catalog — not something onboarding
   * creates per-brand, see role-template.model.js's header comment).
   */
  async ensureSeeded() {
    for (const template of ROLE_TEMPLATE_SEED) {
      await RoleTemplateModel.findOneAndUpdate(
        { key: template.key },
        { $set: template },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  async listTemplates() {
    return RoleTemplateModel.find().sort({ category: 1, key: 1 }).lean();
  }

  /**
   * Copies a template's resolved permission set into a new brand-scoped Role document. No ongoing
   * link is kept between the template and the created Role — a later template revision never
   * silently changes a brand's already-created roles (DEFAULT_ROLE_ARCHITECTURE.md §2).
   */
  async instantiate({ templateKey, brand, createdBy, scopeOverride = null }) {
    const template = await RoleTemplateModel.findOne({ key: templateKey }).lean();
    if (!template) throwError(`Unknown role template "${templateKey}".`, 404);

    let permissions = expandDomainGrantsToPermissions(template.domainGrants);
    if (templateKey === "hr") {
      permissions = permissions.concat(HR_TEMPLATE_IAM_OVERRIDE);
    }

    const scope = scopeOverride || template.defaultScope;

    return RoleModel.create({
      brand,
      name: template.name,
      description: template.description,
      allBranchesAccess: scope === "ALL_BRANCHES",
      permissions,
      isSystemRole: false,
      createdBy,
    });
  }
}

export default new RoleTemplateService();
