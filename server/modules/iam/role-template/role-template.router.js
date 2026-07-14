import express from "express";
import roleTemplateController from "./role-template.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { instantiateTemplateSchema } from "./role-template.validation.js";

// DEFAULT_ROLE_ARCHITECTURE.md §2 — a read-only, platform-owned catalog (list) plus one
// brand-scoped write operation (instantiate a real Role from a template). No update/delete here:
// templates themselves are not tenant-editable; only the Role instantiated from one is.
const router = express.Router();

router.get("/", authenticateToken, authorize("RoleTemplates", "read"), roleTemplateController.list);
router.post(
  "/instantiate",
  authenticateToken,
  authorize("Roles", "create"),
  validate(instantiateTemplateSchema),
  roleTemplateController.instantiate,
);

export default router;
