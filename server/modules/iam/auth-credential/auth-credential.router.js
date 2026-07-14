import express from "express";
import authCredentialController from "./auth-credential.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { issueCredentialSchema, paramsAuthCredentialSchema, paramsPrincipalSchema } from "./auth-credential.validation.js";

const router = express.Router();

// IAM Platform Redesign (V4.0): issuing a PIN/BARCODE/QR is an administrative action (a manager
// assigns a cashier their PIN), not something a client self-serves — gated the same way
// UserAccount creation is.
router.post(
  "/",
  authenticateToken,
  authorize("AuthCredentials", "create"),
  validate(issueCredentialSchema),
  authCredentialController.issue,
);

router.get(
  "/principal/:principalId",
  authenticateToken,
  authorize("AuthCredentials", "read"),
  validate(paramsPrincipalSchema, "params"),
  authCredentialController.listForPrincipal,
);

router.patch(
  "/:id/revoke",
  authenticateToken,
  authorize("AuthCredentials", "delete"),
  validate(paramsAuthCredentialSchema, "params"),
  authCredentialController.revoke,
);

export default router;
