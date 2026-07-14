import express from "express";
import securityEventController from "./security-event.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { paramsUserSecurityEventsSchema, listSecurityEventsQuerySchema } from "./security-event.validation.js";

// IAP V2.0 Milestone 5 — read-only admin visibility into the authentication/security audit trail.
// Intentionally no write endpoints: SecurityEvents are only ever created internally by
// security-event.service.js#record(), never through a REST verb.
const router = express.Router();

router.get(
  "/user/:userId",
  authenticateToken,
  authorize("SecurityEvents", "read"),
  validate(paramsUserSecurityEventsSchema, "params"),
  validate(listSecurityEventsQuerySchema, "query"),
  securityEventController.listForUser,
);

router.get(
  "/",
  authenticateToken,
  authorize("SecurityEvents", "read"),
  validate(listSecurityEventsQuerySchema, "query"),
  securityEventController.listForBrand,
);

export default router;
