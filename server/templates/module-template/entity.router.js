// TEMPLATE — Router (ERP_DEVELOPMENT_STANDARD.md §5). The mandatory chain on EVERY route, zero
// exceptions: authenticateToken, authorize(resource, action), checkModuleEnabled(key), validate(schema[, "params"|"query"]), controller.method.
import express from "express";
import entityController from "./entity.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEntitySchema, updateEntitySchema, paramsEntitySchema, paramsEntityIdsSchema, queryEntitySchema,
} from "./entity.validation.js";

// TEMPLATE: replace "Entities" with the real RESOURCE_ENUM entry (add it additively to
// modules/iam/role/role.model.js first — never remove/rename an existing entry).
const RESOURCE = "Entities";
// TEMPLATE: match the sibling routers already in this domain EXACTLY — read one before guessing
// ("assets" for assets/*, "accounting" for accounting/*, "financial" for expense/*, etc.).
const MODULE_KEY = "TEMPLATE_MODULE_KEY";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize(RESOURCE, "create"), checkModuleEnabled(MODULE_KEY),
    validate(createEntitySchema), entityController.create)
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY),
    validate(queryEntitySchema), entityController.getAll);

// TEMPLATE: any static sibling route (e.g. "/summary", "/generate-due") MUST be registered before
// "/:id" below, or Express will capture it as an :id param.

router.route("/:id")
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY),
    validate(paramsEntitySchema, "params"), entityController.getOne)
  .put(authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY),
    validate(updateEntitySchema), entityController.update)
  .delete(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY),
    validate(paramsEntitySchema, "params"), entityController.hardDelete);

// TEMPLATE: only if enableSoftDelete: true in the repository/service.
router.patch("/soft-delete/:id",
  authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY),
  validate(paramsEntitySchema, "params"), entityController.softDelete);

router.patch("/restore/:id",
  authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY),
  validate(paramsEntitySchema, "params"), entityController.restore);

// TEMPLATE: business-verb action — POST /:id/<verb>, never a generic PUT with a status field.
router.post("/:id/activate",
  authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY),
  validate(paramsEntitySchema, "params"), entityController.activate);

router.delete("/bulk-delete",
  authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY),
  validate(paramsEntityIdsSchema), entityController.bulkHardDelete);

export default router;

// TEMPLATE — after building this file:
// 1. Import + mount in router/v1/index.router.js: router.use("/<domain>/<entities>", entityRouter);
// 2. Boot-check: a temp .boot-check.mjs importing this router + index.router.js, run with `npx tsx`.
